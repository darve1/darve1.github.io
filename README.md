# darve1.log

[Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 테마(v7.6) 기반의 개인 기술 블로그입니다.
`main` 브랜치에 푸시하면 GitHub Actions(`.github/workflows/pages-deploy.yml`)가 빌드해서 GitHub Pages에 배포합니다.

## 카테고리

| 메뉴 | 카테고리 이름 (글 front matter) | 탭 파일 |
|:---|:---|:---|
| 개발 | `개발` | `_tabs/dev.md` |
| CTF/Wargame | `CTF/Wargame` | `_tabs/ctf.md` |
| Bug Bounty | `Bug Bounty` | `_tabs/bugbounty.md` |
| 블로그/기술문서 | `블로그/기술문서` | `_tabs/techdocs.md` |
| 논문/컨퍼런스 | `논문/컨퍼런스` | `_tabs/papers.md` |
| 공모전/자격증 | `공모전/자격증` | `_tabs/contests.md` |

메뉴에 보이는 이름은 `_data/locales/ko-KR.yml`의 `tabs`에서 바꿉니다(키 = 탭 파일 이름).
탭 파일의 `category` 값은 글의 카테고리 이름과 같아야 합니다.

## 글 쓰기 (Obsidian)

이 폴더 자체가 Obsidian 볼트입니다. 설정은 `.obsidian/`에 들어 있습니다.

| 명령 (`Ctrl+P`) | 단축키 | 하는 일 |
|:---|:---|:---|
| `Templater: Create 새 글` | `Ctrl+Alt+N` | 제목 → 카테고리 → 소분류 → 영문 슬러그 → 요약을 묻고 `_posts/YYYY-MM-DD-슬러그.md` 생성 (`published: false`) |
| `Templater: Insert 발행` | `Ctrl+Alt+P` | 열린 글의 `published`를 체크하고 `Git: Commit-and-sync`로 커밋·푸시 |
| `Insert attachment` (Obsidian 기본 명령) | `Ctrl+Alt+F` | 파일 선택 창에서 고른 파일을 글의 첨부 폴더로 복사하고 커서 위치에 넣기 |
| `Templater: Insert 유튜브` | `Ctrl+Alt+Y` | YouTube 주소와 설명을 묻고 영상 넣기 |
| `Templater: Insert 글 링크` | `Ctrl+Alt+L` | 다른 글을 제목으로 골라 링크 넣기 (`[비공개]` 표시 = 아직 발행 전) |

1. **새 글**: `Ctrl+Alt+N`. 질문 중 `Esc`를 누르면 아무 파일도 남지 않습니다. 슬러그가 `dreamhack-xss`면 주소는 `/posts/dreamhack-xss/`.
2. **쓰기**: 사진·동영상·파일은 붙여넣기(`Ctrl+V`), 끌어다 놓기, `Ctrl+Alt+F`로 넣습니다. ([첨부와 링크](#첨부와-링크))
3. **발행**: 글을 연 상태에서 `Ctrl+Alt+P`. 1~2분 뒤 사이트에 반영됩니다.
   이미 발행한 글을 고친 뒤 다시 실행하면 수정 사항이 올라갑니다. (첨부 파일과 다른 파일의 변경도 함께 커밋됩니다.)

템플릿 원본은 `_templates/`(Templater 스크립트)에 있고, 카테고리 목록은 `새 글.md` 안의 `CATEGORIES`에 있습니다.
단축키는 Obsidian 설정 → 단축키에서 바꿀 수 있습니다.

- `published`가 체크되지 않은 글은 사이트에 나오지 않지만, **공개 레포라 GitHub에서는 원문이 보입니다.**
  그 글의 첨부 파일도 레포에 올라가고, 주소를 알면 사이트에서 열 수 있습니다.
- Obsidian을 열면 GitHub의 변경 사항을 자동으로 받아옵니다(pull). 자동 커밋·푸시는 꺼 두었습니다.
- 위키링크(`[[...]]`)는 블로그에서 링크가 되지 않습니다. 볼트는 마크다운 링크를 쓰도록 설정해 두었습니다
  (`[[`를 입력해 글을 골라도 마크다운 링크로 들어갑니다).

### 첨부와 링크

첨부 파일은 **글마다 따로** `assets/posts/<글 파일 이름>/`에 저장됩니다.
예: `_posts/2026-10-27-dreamhack-xss.md`의 첨부 → `assets/posts/2026-10-27-dreamhack-xss/`

- 붙여넣은 스크린샷은 `image-20261027-153000.png`처럼 시간으로 이름이 붙고, 끌어다 놓거나 `Ctrl+Alt+F`로 넣은 파일은 원래 이름을 유지합니다.
  파일 이름의 공백과 `# % ? :` 같은 문자는 `-`로 바뀝니다.
- 글 파일 이름을 바꾸거나 옮기면 첨부 폴더와 링크도 따라 바뀝니다.
  글을 지우면 그 글만 쓰던 첨부도 함께 지워집니다(Obsidian 휴지통 설정을 따름).
- 첨부를 고치려면 그 폴더의 파일을 같은 이름으로 바꾸면 됩니다. 글에서 지운 첨부는 명령
  `Custom Attachment Location: Delete unused attachments in current note`(또는 `… in entire vault`)로 정리합니다.

글에 쓰는 문법과 블로그에서 보이는 모습 (`_plugins/obsidian-content.rb`가 변환):

| Obsidian에서 | 블로그에서 |
|:---|:---|
| `![](assets/posts/…/image.png)` | 이미지 (클릭하면 크게) |
| `![설명\|300](assets/posts/…/image.png)` | 너비 300px 이미지 (`\|300x200`이면 높이까지) |
| `![설명](assets/posts/…/demo.mp4)` | 동영상 플레이어 + 설명 (mp4·webm·mov·m4v·ogv) |
| `![](assets/posts/…/sound.mp3)` | 오디오 플레이어 (mp3·wav·ogg·m4a·flac 등) |
| `![](assets/posts/…/slide.pdf)` | PDF 뷰어 + 파일 링크 |
| `![](assets/posts/…/exploit.zip)` | 다운로드 링크 (그 밖의 모든 파일) |
| `[보고서](assets/posts/…/report.pdf)` | 파일 링크 (📎 아이콘) |
| `![설명](https://www.youtube.com/watch?v=…&t=90)` | YouTube 플레이어 (90초부터, `youtu.be`·shorts도 가능) |
| `[다른 글](_posts/2026-10-26-slug.md)` | `/posts/slug/` 링크. 아직 발행 전인 글이면 링크 없이 글자만 |
| `[제목](_posts/…md#제목)`, `[제목](#제목)` | 그 글(또는 이 글)의 제목 위치로 이동 |
| `> [!tip] 제목` + `> 내용` | 강조 박스 (`tip`·`info`·`warning`·`danger`, `note`·`bug` 같은 Obsidian 종류도 비슷한 색으로) |

> [!WARNING]
> 동영상은 레포에 그대로 올라갑니다. **GitHub는 100MB 넘는 파일을 거부**하고 50MB부터 경고하니,
> 큰 영상은 YouTube에 올리고 `Ctrl+Alt+Y`로 넣으세요.

첨부·링크가 깨지면 배포 전 검사(html-proofer)에서 걸려 사이트가 갱신되지 않습니다. GitHub Actions 로그에서 어느 링크인지 확인하세요.

Chirpy 강조 박스 문법도 그대로 쓸 수 있습니다:

```markdown
> 강조할 내용
{: .prompt-tip }   <!-- prompt-info / prompt-warning / prompt-danger -->
```

직접 만들 때의 front matter 형식:

```yaml
---
title: "글 제목"
description: "홈 목록에 보일 요약"
categories: [CTF/Wargame, Dreamhack]   # [대분류, 소분류]
tags: [web, xss]
published: true
---
```

## 커스터마이징한 파일

- `_config.yml`: 언어(ko-KR), 시간대, 제목, 프로필
- `_data/locales/ko-KR.yml`: 메뉴 이름(카테고리 6개, 소개)
- `_includes/sidebar.html`: 사이드바 메뉴를 Categories / Explore 그룹으로 나누고, `hidden: true`인 탭은 메뉴에서 숨김
- `_tabs/tags.md`: 메뉴에서 숨김 (태그 페이지 상단 경로가 `/tags/`를 링크하므로 페이지는 유지)
- `_tabs/archives.md` 삭제, `_data/contact.yml`에서 RSS 버튼 제거
- `_layouts/category-tab.html`: 카테고리 메뉴 페이지(소개 + 글 목록)
- `_includes/metadata-hook.html`, `assets/css/jekyll-theme-chirpy.scss`: Pretendard 폰트, 사이드바 스타일, 첨부(PDF 뷰어·파일 링크) 스타일
- `_plugins/obsidian-content.rb`: Obsidian 문법 변환(동영상·오디오·PDF·파일·YouTube·글 링크·콜아웃·이미지 크기)
- `_tabs/about.md`: 자기소개
- `.obsidian/`, `_templates/`: Obsidian 볼트 설정과 명령(새 글·발행·유튜브·글 링크)
  - 플러그인: Obsidian Git, Templater, Custom Attachment Location(글별 첨부 폴더), Advanced Rename and Delete Handler(이름 변경·삭제 시 첨부 따라가기)

## 로컬에서 보기

```bash
bundle install
bundle exec jekyll serve
```
