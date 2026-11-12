---
title: "함수 프롤로그와 에필로그"
description: "함수가 시작할 때 스택 프레임을 만들고 끝날 때 정리하는 프롤로그·에필로그를 gdb로 확인해 봅니다"
categories: ["공부", "System Hacking"]
tags: [pwnable, system-hacking, assembly, stack-frame]
published: true
---

## 개요

함수의 프롤로그와 에필로그가 어떤 명령으로 이루어져 있는지, 그리고 왜 모든 함수의 앞뒤에 이 코드가 붙는지 알아봅시다. 이 내용을 알아야 스택 버퍼 오버플로우가 어떻게 반환 주소를 덮고 실행 흐름을 바꾸는지 정확히 이해할 수 있습니다.

## 스택 프레임

함수는 실행되는 동안 지역 변수를 저장할 공간이 필요하고, 실행이 끝나면 자신을 호출한 함수로 돌아갈 주소도 알고 있어야 합니다. 이런 정보는 스택에 저장되는데, 함수 하나가 사용하는 스택 영역을 스택 프레임(Stack Frame)이라고 합니다.

스택 프레임은 함수가 호출될 때마다 새로 만들어지고, 함수가 끝나면 정리됩니다. 이때 함수의 시작 부분에서 스택 프레임을 만드는 코드를 프롤로그(Prologue), 함수의 끝 부분에서 스택 프레임을 정리하고 호출한 함수로 돌아가는 코드를 에필로그(Epilogue)라고 합니다. 두 코드 모두 직접 작성하는 것이 아니라 컴파일러가 자동으로 넣어 줍니다.

## 레지스터와 명령어

프롤로그와 에필로그를 이해하려면 먼저 스택과 관련된 레지스터 3개를 알아야 합니다.

- `rsp`: 스택의 꼭대기 주소를 가리킵니다. `push`, `pop`, `call`, `ret`을 실행할 때마다 값이 바뀝니다.
- `rbp`: 현재 함수의 스택 프레임 기준점입니다. 함수가 실행되는 동안에는 바뀌지 않습니다.
- `rip`: 다음에 실행할 명령어의 주소입니다.

스택은 높은 주소에서 낮은 주소 방향으로 자라기 때문에, `push`를 하면 `rsp`가 8 줄어들고 `pop`을 하면 8 늘어납니다.

함수 호출과 관련된 명령어는 다음과 같이 동작합니다.

```text
call func   ; push (다음 명령어 주소) + jmp func
ret         ; pop rip
leave       ; mov rsp, rbp + pop rbp
```

`call`은 다음 명령어의 주소를 스택에 넣고 함수로 이동하는데, 이때 스택에 들어간 주소가 반환 주소입니다. 반대로 `ret`은 스택 꼭대기에 있는 값을 꺼내 그 주소로 이동합니다.

## 프롤로그

gcc로 컴파일하면 함수는 보통 다음과 같은 프롤로그로 시작합니다.

```text
push rbp
mov  rbp, rsp
sub  rsp, 0x18
```

프롤로그는 순서대로 다음을 실행합니다.

1. `push rbp`: 호출한 함수의 `rbp` 값을 스택에 저장합니다. 이렇게 저장된 값을 SFP(Saved Frame Pointer)라고 합니다.
2. `mov rbp, rsp`: 현재 `rsp` 값을 `rbp`에 복사해 이 함수의 기준점으로 삼습니다.
3. `sub rsp, 0x18`: `rsp`를 0x18만큼 빼서 지역 변수를 저장할 공간을 만듭니다.

각 단계에서 스택이 어떻게 바뀌는지 그림으로 나타내면 다음과 같습니다. 주소는 아래 실습에서 gdb로 확인한 값입니다.

![프롤로그 단계별 스택 변화](assets/posts/2026-11-12-function-prologue-epilogue/prologue-steps.png)

`rbp`를 기준점으로 쓰는 이유는 `rsp`가 함수 안에서 계속 바뀌기 때문입니다. `rbp`는 함수가 끝날 때까지 바뀌지 않으므로, 지역 변수를 항상 `[rbp-0x4]`처럼 같은 위치로 찾을 수 있습니다. 그리고 원래 `rbp` 값을 저장해 두는 이유는, 함수가 끝나고 돌아갔을 때 호출한 함수가 자기 `rbp`를 다시 써야 하기 때문입니다.

## 에필로그

에필로그는 프롤로그에서 한 일을 반대로 되돌립니다.

```text
leave
ret
```

에필로그는 순서대로 다음을 실행합니다.

1. `leave`: `mov rsp, rbp`로 지역 변수 공간을 정리하고, `pop rbp`로 저장해 둔 SFP를 꺼내 호출한 함수의 `rbp`를 되돌립니다.
2. `ret`: 스택 꼭대기에 있는 반환 주소를 꺼내 그 주소로 돌아갑니다.

![에필로그 단계별 스택 변화](assets/posts/2026-11-12-function-prologue-epilogue/epilogue-steps.png)

## 직접 확인해 보기

> [!info] 실습 환경
> Ubuntu 24.04 (WSL2, x86_64), gcc 13.3.0, glibc 2.39, gdb 15.1

예제 코드를 작성해서 직접 확인해 보았습니다.

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

### 디스어셈블

gdb에서 `disassemble func`로 `func`를 디스어셈블했습니다. (`set disassembly-flavor intel`로 Intel 문법으로 바꿔서 출력했습니다.)

![func 디스어셈블](assets/posts/2026-11-12-function-prologue-epilogue/disas-func.png)

`func+4`부터 `func+8`까지가 프롤로그, `func+36`과 `func+37`이 에필로그입니다. 그 사이에서 인자 `x`는 `rbp-0x14`, 지역 변수 `y`는 `rbp-0x4`처럼 `rbp`를 기준으로 접근하는 것을 볼 수 있습니다.

### gdb로 확인하기

`main`에서 `func`를 호출하는 `main+13`과, 프롤로그가 끝난 `func+12`에 중단점을 걸고 실행했습니다.

먼저 `call func` 직전의 `rsp`와 `rbp`입니다.

![call func 직전](assets/posts/2026-11-12-function-prologue-epilogue/gdb-before-call.png)

`rsp`와 `rbp`가 모두 `0x7fffffffd730`입니다.

다음은 프롤로그가 끝난 직후입니다.

![프롤로그 직후](assets/posts/2026-11-12-function-prologue-epilogue/gdb-after-prologue.png)

`rbp`는 `0x7fffffffd720`, `rsp`는 그보다 0x18 작은 `0x7fffffffd708`이 되었습니다. `x/2gx $rbp`로 `rbp`가 가리키는 곳을 보면, `main`의 `rbp`였던 `0x7fffffffd730`(SFP)과 `call func` 다음 명령어의 주소인 `0x555555555179`(`main+18`, 반환 주소)가 저장되어 있습니다.

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
