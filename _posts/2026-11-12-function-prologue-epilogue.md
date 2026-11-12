---
title: "함수 프롤로그와 에필로그"
description: "함수가 시작할 때 스택 프레임을 만들고 끝날 때 정리하는 프롤로그·에필로그를 gdb로 확인해 봅니다"
categories: ["공부", "System Hacking"]
tags: [pwnable, system-hacking, assembly, stack-frame]
image: /assets/posts/2026-11-12-function-prologue-epilogue/thumbnail.png
published: true
---

## 개요

함수의 프롤로그와 에필로그가 어떤 명령으로 이루어져 있는지, 그리고 왜 모든 함수의 앞뒤에 이 코드가 붙는지 알아봅시다. 이 내용을 알아야 스택 버퍼 오버플로우가 어떻게 반환 주소를 덮고 실행 흐름을 바꾸는지 정확히 이해할 수 있습니다.

## 스택 프레임

함수가 실행되려면 다음 세 가지를 스택에 저장해 두어야 합니다.

- 함수가 쓰는 지역 변수
- 함수가 끝나면 돌아갈 주소 (반환 주소)
- 자신을 호출한 함수가 쓰던 `rbp` 값 (SFP, Saved Frame Pointer)

함수 하나가 이 정보를 저장하는 데 쓰는 스택 영역을 스택 프레임(Stack Frame)이라고 합니다. `main`이 `func`를 호출했다면 스택은 다음과 같은 모양이 됩니다.

![스택 프레임의 구조](assets/posts/2026-11-12-function-prologue-epilogue/stack-frame.png)

스택 프레임은 함수가 호출될 때마다 새로 만들어지고, 함수가 끝나면 정리됩니다.

- 프롤로그(Prologue): 함수의 시작 부분에서 스택 프레임을 만드는 코드입니다.
- 에필로그(Epilogue): 함수의 끝 부분에서 스택 프레임을 정리하고 호출한 함수로 돌아가는 코드입니다.

두 코드 모두 직접 작성하는 것이 아니라 컴파일러가 자동으로 넣어 줍니다.

## 레지스터와 스택

위 그림에 나온 `rsp`와 `rbp`를 포함해, 스택과 관련된 레지스터 3개를 먼저 알아야 합니다.

- `rsp`: 스택의 꼭대기 주소를 가리킵니다. `push`, `pop`, `call`, `ret`을 실행할 때마다 값이 바뀝니다.
- `rbp`: 현재 함수의 스택 프레임 기준점입니다. 함수가 실행되는 동안에는 바뀌지 않습니다.
- `rip`: 다음에 실행할 명령어의 주소입니다.

스택은 높은 주소에서 낮은 주소 방향으로 자랍니다. 그래서 스택에 값을 넣으면(`push`) `rsp`가 8 줄어들고, 값을 꺼내면(`pop`) 8 늘어납니다. 이 글의 그림은 모두 낮은 주소를 위쪽에 그렸습니다.

## 예제 코드

> [!info] 실습 환경
> Ubuntu 24.04 (WSL2, x86_64), gcc 13.3.0, glibc 2.39, gdb 15.1

이 글에서는 다음 코드에서 `main`이 `func`를 호출하고 돌아오는 과정을 한 단계씩 따라가 보겠습니다.

```c
// Name: frame.c
// Compile: gcc -o frame frame.c

int add(int a, int b) {
    return a + b;
}

int func(int x) {
    int y = add(x, 2);
    return y;
}

int main(void) {
    return func(1);
}
```

gdb에서 `disassemble func`로 `func`를 디스어셈블하면 다음과 같습니다. (`set disassembly-flavor intel`로 Intel 문법으로 바꿔서 출력했습니다.)

![func 디스어셈블](assets/posts/2026-11-12-function-prologue-epilogue/disas-func.png)

`func+4`부터 `func+8`까지가 프롤로그, `func+36`과 `func+37`이 에필로그입니다. 아래 그림에 나오는 주소는 모두 이 프로그램을 gdb로 실행해서 확인한 값입니다.

## 함수 호출

`main`은 `call func`로 `func`를 호출합니다. `call`은 순서대로 다음을 실행합니다.

1. 다음 명령어의 주소(`main+18`)를 스택에 넣습니다. 이 값이 반환 주소입니다.
2. `rip`를 `func`의 주소로 바꿔서 `func`로 이동합니다.

![call func 실행 전후의 스택](assets/posts/2026-11-12-function-prologue-epilogue/step-call.png)

스택에 값을 하나 넣었기 때문에 `rsp`가 `0x7fffffffd730`에서 `0x7fffffffd728`로 8 줄어들었습니다.

## 프롤로그

`func`로 넘어오면 가장 먼저 프롤로그가 실행됩니다.

```text
push rbp
mov  rbp, rsp
sub  rsp, 0x18
```

한 줄씩 살펴보겠습니다.

### push rbp

지금 `rbp`에는 `main`의 기준점이 들어 있습니다. `func`도 `rbp`를 자기 기준점으로 써야 하기 때문에, 값을 바꾸기 전에 스택에 저장해 둡니다. 이렇게 저장된 값이 SFP입니다.

![push rbp 실행 전후의 스택](assets/posts/2026-11-12-function-prologue-epilogue/step-push-rbp.png)

### mov rbp, rsp

`rsp`의 값을 `rbp`에 복사합니다. 이제 `rbp`는 `func`의 기준점이 됩니다.

![mov rbp, rsp 실행 전후의 스택](assets/posts/2026-11-12-function-prologue-epilogue/step-mov-rbp.png)

### sub rsp, 0x18

`rsp`를 0x18만큼 줄여서 지역 변수를 저장할 공간을 만듭니다.

![sub rsp, 0x18 실행 전후의 스택](assets/posts/2026-11-12-function-prologue-epilogue/step-sub-rsp.png)

여기까지가 프롤로그입니다. 처음에 본 그림과 같은 `func`의 스택 프레임이 만들어졌습니다.

### rbp를 기준점으로 쓰는 이유

`rsp`는 함수 안에서도 `push`나 `call`을 할 때마다 바뀝니다. 반면 `rbp`는 함수가 끝날 때까지 바뀌지 않습니다. 그래서 지역 변수를 항상 `[rbp-0x4]`처럼 같은 위치로 찾을 수 있습니다.

위 디스어셈블 결과에서도 인자 `x`는 `rbp-0x14`, 지역 변수 `y`는 `rbp-0x4`로 접근하는 것을 볼 수 있습니다.

## 에필로그

`func`가 할 일을 마치면 에필로그가 실행됩니다. 에필로그는 프롤로그에서 한 일을 반대로 되돌립니다.

```text
leave
ret
```

### leave

`leave`는 `mov rsp, rbp`와 `pop rbp` 두 명령을 합친 것입니다. 순서대로 살펴보겠습니다.

먼저 `mov rsp, rbp`로 `rsp`를 `rbp`의 위치로 옮깁니다. 지역 변수 공간이 정리됩니다.

![mov rsp, rbp 실행 전후의 스택](assets/posts/2026-11-12-function-prologue-epilogue/step-leave-mov.png)

정리된 공간의 값이 지워지는 것은 아닙니다. `rsp`가 내려가서 더 이상 쓰지 않는 공간이 되었을 뿐입니다.

다음으로 `pop rbp`로 스택에서 SFP를 꺼내 `rbp`에 넣습니다. `rbp`가 `main`의 기준점으로 돌아가고, 값을 하나 꺼냈기 때문에 `rsp`는 8 늘어납니다.

![pop rbp 실행 전후의 스택](assets/posts/2026-11-12-function-prologue-epilogue/step-leave-pop.png)

### ret

`ret`은 스택 꼭대기에 있는 값을 꺼내 `rip`에 넣습니다. 지금 스택 꼭대기에는 반환 주소가 있으므로 `main+18`로 돌아갑니다.

![ret 실행 전후의 스택](assets/posts/2026-11-12-function-prologue-epilogue/step-ret.png)

`rsp`와 `rbp`가 모두 `call func`를 실행하기 전과 같은 `0x7fffffffd730`으로 돌아왔습니다.

## gdb로 확인하기

위 그림의 값을 gdb로 직접 확인해 보았습니다. `main`에서 `func`를 호출하는 `main+13`과, 프롤로그가 끝난 `func+12`에 중단점을 걸고 실행했습니다.

먼저 `call func` 직전의 `rsp`와 `rbp`입니다.

![call func 직전](assets/posts/2026-11-12-function-prologue-epilogue/gdb-before-call.png)

`rsp`와 `rbp`가 모두 `0x7fffffffd730`입니다.

다음은 프롤로그가 끝난 직후입니다.

![프롤로그 직후](assets/posts/2026-11-12-function-prologue-epilogue/gdb-after-prologue.png)

`rbp`는 `0x7fffffffd720`, `rsp`는 그보다 0x18 작은 `0x7fffffffd708`이 되었습니다.

`x/2gx $rbp`로 `rbp`가 가리키는 곳을 보면 값이 2개 저장되어 있습니다. 첫 번째 `0x7fffffffd730`은 `main`의 `rbp`였던 값(SFP)이고, 두 번째 `0x555555555179`는 `call func` 다음 명령어의 주소인 `main+18`(반환 주소)입니다.

마지막으로 `finish`로 `func`가 반환될 때까지 실행했습니다.

![func 반환 후](assets/posts/2026-11-12-function-prologue-epilogue/gdb-after-ret.png)

`main+18`로 돌아왔고, `rsp`와 `rbp`도 `call func` 직전과 같은 `0x7fffffffd730`으로 돌아왔습니다. 에필로그가 프롤로그에서 바꾼 것을 모두 되돌려 놓은 것입니다.

## 프롤로그와 에필로그를 하는 이유

정리하면 프롤로그와 에필로그는 다음과 같은 목적으로 실행됩니다.

1. 지역 변수를 저장할 공간을 만들고, 함수가 끝나면 정리합니다.
2. `rbp`를 기준점으로 써서 지역 변수를 항상 같은 위치로 찾을 수 있게 합니다.
3. 호출한 함수의 `rbp`를 저장했다가 되돌려서, 함수가 끝난 뒤에도 호출한 함수가 그대로 실행될 수 있게 합니다.

## 정리

- 스택 프레임은 함수 하나가 사용하는 스택 영역이고, 프롤로그에서 만들고 에필로그에서 정리합니다.
- 프롤로그(`push rbp; mov rbp, rsp; sub rsp, N`)는 호출한 함수의 `rbp`를 저장하고, 새 기준점을 정하고, 지역 변수 공간을 만듭니다.
- 에필로그(`leave; ret`)는 지역 변수 공간을 정리하고 `rbp`를 되돌린 뒤 반환 주소로 돌아갑니다.
- `ret`은 스택의 값을 그대로 믿기 때문에, 반환 주소나 SFP가 덮이면 실행 흐름이 바뀔 수 있습니다.
