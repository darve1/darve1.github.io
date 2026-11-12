---
title: "함수 프롤로그와 에필로그"
description: "함수가 시작할 때 스택 프레임을 만들고 끝날 때 정리하는 프롤로그·에필로그를 gdb로 한 명령씩 따라가 봅니다"
categories: ["공부", "System Hacking"]
tags: [pwnable, system-hacking, assembly, stack-frame]
published: true
---

## 개요

함수의 프롤로그와 에필로그가 어떤 명령으로 이루어져 있는지, 그리고 왜 모든 함수의 앞뒤에 이 코드가 붙는지 알아봅시다. 이 내용을 알아야 스택 버퍼 오버플로우가 어떻게 반환 주소를 덮고 실행 흐름을 바꾸는지 정확히 이해할 수 있습니다.

## 스택 프레임

함수는 실행되는 동안 지역 변수를 저장할 공간이 필요하고, 실행이 끝나면 자신을 호출한 함수로 돌아갈 주소도 알고 있어야 합니다. 이런 정보는 스택에 저장되는데, 함수 하나가 사용하는 스택 영역을 스택 프레임(Stack Frame)이라고 합니다.

스택 프레임은 함수가 호출될 때마다 새로 만들어지고, 함수가 끝나면 정리됩니다. 그래서 재귀 함수처럼 같은 함수가 여러 번 호출되어도 호출마다 지역 변수가 따로 저장됩니다.

이때 함수의 시작 부분에서 스택 프레임을 만드는 코드를 프롤로그(Prologue), 함수의 끝 부분에서 스택 프레임을 정리하고 호출한 함수로 돌아가는 코드를 에필로그(Epilogue)라고 합니다. 두 코드 모두 직접 작성하는 것이 아니라 컴파일러가 자동으로 넣어 줍니다.

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

`call`은 다음 명령어의 주소를 스택에 넣고 함수로 이동하는데, 이때 스택에 들어간 주소가 반환 주소입니다. 반대로 `ret`은 스택 꼭대기에 있는 값을 꺼내 `rip`에 넣습니다. 즉, `ret`을 실행할 때 스택 꼭대기에 어떤 값이 있든 그 주소로 이동하게 됩니다.

## 프롤로그

최적화 없이(`-O0`) 컴파일하면 대부분의 함수는 다음과 같은 프롤로그로 시작합니다.

```text
push rbp
mov  rbp, rsp
sub  rsp, 0x30
```

프롤로그는 순서대로 다음을 실행합니다.

1. `push rbp`: 호출한 함수의 `rbp` 값을 스택에 저장합니다. 이 함수도 `rbp`를 기준점으로 쓸 것이기 때문에, 값을 바꾸기 전에 원래 값을 저장해 두는 것입니다. 이렇게 저장된 값이 SFP(Saved Frame Pointer)입니다.
2. `mov rbp, rsp`: 현재 `rsp` 값을 `rbp`에 복사해 이 함수의 기준점으로 삼습니다.
3. `sub rsp, 0x30`: `rsp`에서 0x30을 빼서 지역 변수를 저장할 공간을 만듭니다. 스택은 낮은 주소로 자라기 때문에 `rsp`를 빼면 `rbp`와 `rsp` 사이에 공간이 생깁니다.

각 단계에서 스택이 어떻게 바뀌는지 그림으로 나타내면 다음과 같습니다. 주소는 아래 실습에서 gdb로 확인한 값입니다.

![프롤로그 단계별 스택 변화](assets/posts/2026-11-12-function-prologue-epilogue/prologue-steps.png)

여기서 `rbp`를 따로 기준점으로 두는 이유는 `rsp`가 함수 안에서 계속 바뀌기 때문입니다. `rsp`를 기준으로 지역 변수를 찾으면 `push`나 `call`을 할 때마다 같은 변수의 위치가 달라지지만, `rbp`는 함수가 끝날 때까지 그대로이므로 `[rbp-0x4]`처럼 항상 같은 위치로 지역 변수에 접근할 수 있습니다.

또한 `rbp`는 호출된 함수가 원래 값으로 돌려놓아야 하는 레지스터(callee-saved)입니다. 함수가 끝나고 돌아갔을 때 `rbp`가 바뀌어 있으면 호출한 함수가 자기 지역 변수를 찾을 수 없기 때문에, `push rbp`로 원래 값을 저장해 두는 것입니다.

## 에필로그

에필로그는 프롤로그에서 한 일을 반대로 되돌립니다.

```text
leave
ret
```

에필로그는 순서대로 다음을 실행합니다.

1. `leave`: 먼저 `mov rsp, rbp`로 `rsp`를 기준점으로 되돌립니다. 이렇게 하면 `sub rsp, 0x30`으로 만들었던 지역 변수 공간이 한 번에 정리됩니다. 그다음 `pop rbp`로 스택에 저장해 둔 SFP를 꺼내 호출한 함수의 `rbp`를 복원합니다.
2. `ret`: 이제 스택 꼭대기에는 `call`이 넣어 둔 반환 주소가 있습니다. `ret`이 이 값을 꺼내 `rip`에 넣으면, 호출한 함수의 `call` 다음 명령어부터 다시 실행됩니다.

![에필로그 단계별 스택 변화](assets/posts/2026-11-12-function-prologue-epilogue/epilogue-steps.png)

## 직접 확인해 보기

> [!info] 실습 환경
> Ubuntu 24.04 (WSL2, x86_64), gcc 13.3.0, glibc 2.39, gdb 15.1

예제 코드를 작성해서 직접 확인해 보았습니다. 카나리 코드가 섞이지 않도록 `-fno-stack-protector` 옵션으로 카나리를 끄고 컴파일했습니다.

```c
// Name: frame.c
// Compile: gcc -O0 -fno-stack-protector -o frame frame.c

#include <stdio.h>

int add(int a, int b) {
    int sum = a + b;
    return sum;
}

int func(int x) {
    char buf[16];
    int y = add(x, 2);
    snprintf(buf, sizeof(buf), "%d", y);
    puts(buf);
    return y;
}

int main(void) {
    func(1);
    return 0;
}
```

### 디스어셈블

gdb에서 `disassemble func`로 `func`를 디스어셈블하면 앞에서 설명한 프롤로그와 에필로그를 확인할 수 있습니다. (`set disassembly-flavor intel`로 Intel 문법으로 바꿔서 출력했습니다.)

![func 디스어셈블](assets/posts/2026-11-12-function-prologue-epilogue/disas-func.png)

맨 앞의 `endbr64`는 Intel CET라는 보호 기법에서 쓰는 명령어로, 프롤로그와는 관계없습니다. 그 뒤로 `push rbp`, `mov rbp,rsp`, `sub rsp,0x30`이 있고, 마지막에 `leave`와 `ret`이 있습니다. 지역 변수 `y`는 `rbp-0x4`, `buf`는 `rbp-0x20`, 인자 `x`는 `rbp-0x24`처럼 모두 `rbp`를 기준으로 접근하는 것을 볼 수 있습니다.

### gdb로 따라가기

gdb에서 `main`이 `func`를 호출하는 `main+13`에 중단점을 걸고 실행한 뒤, `display`로 다음에 실행할 명령어와 `rsp`, `rbp` 값이 매번 출력되도록 설정했습니다. 그리고 `si`로 한 명령어씩 실행했습니다. `si`를 실행할 때마다 출력되는 명령어는 다음에 실행할 명령어이고, `rsp`와 `rbp`는 바로 앞의 명령어까지 실행한 상태입니다.

![프롤로그를 한 명령어씩 실행한 결과](assets/posts/2026-11-12-function-prologue-epilogue/trace-prologue.png)

`call func` 직전에는 `rsp`와 `rbp`가 모두 `0x7fffffffd720`입니다. `call`을 실행하면 반환 주소가 스택에 들어가면서 `rsp`가 `0x7fffffffd718`로 8 줄어들고, `push rbp`로 `main`의 `rbp`가 저장되면서 `0x7fffffffd710`으로 다시 8 줄어듭니다. `mov rbp,rsp` 후에는 `rbp`도 `0x7fffffffd710`이 되고, `sub rsp,0x30` 후에는 `rsp`만 `0x7fffffffd6e0`으로 0x30 줄어들어 지역 변수 공간이 생깁니다.

이어서 `leave`가 있는 `func+82`에 중단점을 걸고 에필로그도 같은 방법으로 확인했습니다. 중간에 출력된 `3`은 `puts`가 출력한 값입니다.

![에필로그를 한 명령어씩 실행한 결과](assets/posts/2026-11-12-function-prologue-epilogue/trace-epilogue.png)

`leave` 후에는 `rsp`가 `0x7fffffffd718`, `rbp`가 `0x7fffffffd720`으로 `push rbp` 직전 상태로 돌아가고, `ret` 후에는 `rsp`도 `0x7fffffffd720`이 되어 `call func` 직전과 완전히 같아집니다. 실행 위치도 `call func` 다음 명령어인 `main+18`로 돌아왔습니다. 즉, `main` 입장에서는 함수를 호출하기 전과 스택 상태가 똑같습니다.

프롤로그가 끝난 시점에 `rbp`가 가리키는 곳을 확인해 보면 SFP와 반환 주소가 저장되어 있습니다.

![rbp가 가리키는 곳의 값](assets/posts/2026-11-12-function-prologue-epilogue/sfp-ret.png)

`0x7fffffffd720`은 `main`의 `rbp`이고, `0x5555555551ed`는 `main`에서 `call func` 다음 명령어의 주소(`main+18`)입니다. 이 시점의 스택을 그려 보면 다음과 같습니다.

![func의 스택 프레임](assets/posts/2026-11-12-function-prologue-epilogue/func-frame.png)

### 0x24가 아니라 0x30인 이유

`func`의 지역 변수 중 가장 아래에 있는 `x`가 `rbp-0x24`에 있으니 0x24바이트면 충분할 것 같은데, 실제로는 0x30바이트를 확보했습니다. 이는 스택 정렬 때문입니다.

x86-64 리눅스의 호출 규약은 `call`을 실행하는 순간 `rsp`가 16의 배수여야 한다고 정해 두었습니다. 위 결과를 보면 `call func` 직전 `rsp`는 `0x...d720`으로 16의 배수입니다. `call`로 반환 주소가 들어가면 `0x...d718`이 되어 8바이트 어긋나는데, `push rbp`를 하면 `0x...d710`이 되어 다시 16의 배수가 됩니다. 여기서 16의 배수만큼 빼야 `func` 안에서 다른 함수를 호출할 때도 정렬이 유지되기 때문에, 0x24를 16의 배수로 올린 0x30을 빼는 것입니다.

정렬이 맞지 않으면 `movaps`처럼 16바이트로 정렬된 주소만 다룰 수 있는 명령어에서 프로그램이 죽을 수 있습니다.

### sub rsp가 없는 함수

같은 바이너리에서 `add` 함수를 보면 지역 변수 `sum`이 있는데도 `sub rsp`가 없습니다.

![add 디스어셈블](assets/posts/2026-11-12-function-prologue-epilogue/disas-add.png)

`add`처럼 다른 함수를 호출하지 않는 함수는 `rsp`를 옮기지 않고 `rsp` 아래 128바이트를 그대로 사용합니다. 이 영역을 레드 존(Red Zone)이라고 하는데, 호출 규약에서 시그널 핸들러 등이 이 영역을 덮어쓰지 않도록 보장하고 있습니다. `rsp`를 옮기지 않았으니 되돌릴 필요도 없어서, 에필로그도 `leave` 대신 `pop rbp`만 실행합니다.

참고로 최적화 옵션(`-O2`)을 켜고 컴파일하면 `add`는 `lea eax,[rdi+rsi*1]`과 `ret` 두 줄만 남고 프롤로그와 에필로그가 아예 사라집니다. gcc는 `-O1` 이상부터 `-fomit-frame-pointer`가 적용되어 `rbp` 기준점을 만들지 않기 때문입니다. 따라서 `rbp` 기준점이 꼭 필요한 것은 아니지만, 최적화하지 않은 코드에서는 디버깅하기 쉽도록 기준점을 만듭니다.

## 프롤로그와 에필로그를 하는 이유

정리하면 프롤로그와 에필로그는 다음과 같은 목적으로 실행됩니다.

1. 함수가 끝난 뒤에도 호출한 함수가 원래대로 실행될 수 있도록 `rbp`를 저장하고 복원합니다.
2. 지역 변수를 저장할 공간을 만들고, 함수가 끝나면 정리합니다.
3. `rsp`가 바뀌어도 지역 변수에 같은 위치로 접근할 수 있도록 `rbp`를 기준점으로 사용합니다.
4. 함수를 호출할 때 스택이 16바이트로 정렬되도록 맞춥니다.

또한 SFP를 따라가면 이전 함수들의 `rbp`를 차례로 찾을 수 있어서, gdb의 `bt`처럼 함수 호출 순서를 확인할 때도 쓰입니다.

## 정리

- 스택 프레임은 함수 하나가 사용하는 스택 영역이고, 프롤로그에서 만들고 에필로그에서 정리합니다.
- 프롤로그(`push rbp; mov rbp, rsp; sub rsp, N`)는 호출한 함수의 `rbp`를 저장하고, 새 기준점을 정하고, 지역 변수 공간을 만듭니다.
- 에필로그(`leave; ret`)는 지역 변수 공간을 정리하고 `rbp`를 복원한 뒤 반환 주소로 돌아갑니다.
- `ret`은 스택의 값을 그대로 믿기 때문에, 반환 주소나 SFP가 덮이면 실행 흐름이 바뀔 수 있습니다.
