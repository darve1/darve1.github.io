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

1. **새 글**: 왼쪽 리본의 "새 고유 노트 만들기" 또는 명령 팔레트(`Ctrl+P`) → `Unique note creator: Create new unique note`
   → `_posts/YYYY-MM-DD-HHmm.md`가 `_templates/post.md` 내용으로 만들어집니다.
2. **파일 이름**: 날짜 뒤 `HHmm`을 영문 슬러그로 바꿉니다. 예: `2026-10-27-dreamhack-xss.md` → 주소 `/posts/dreamhack-xss/`
   (Jekyll은 `YYYY-MM-DD-`로 시작하지 않는 `_posts` 파일을 무시합니다.)
3. **속성**: `title`, `description`, `categories`(첫 값 = 위 표의 카테고리 이름), `tags`를 채웁니다.
4. **이미지**: 붙여넣기(`Ctrl+V`)하면 `assets/img/posts/`에 저장되고 블로그에서도 그대로 보입니다.
5. **공개**: 다 쓰면 `published`를 체크하고 명령 팔레트 → `Git: Commit-and-sync`. 1~2분 뒤 사이트에 반영됩니다.

- `published`가 체크되지 않은 글은 사이트에 나오지 않지만, **공개 레포라 GitHub에서는 원문이 보입니다.**
- Obsidian을 열면 GitHub의 변경 사항을 자동으로 받아옵니다(pull). 자동 커밋·푸시는 꺼 두었습니다.
- 위키링크(`[[...]]`)와 Obsidian 콜아웃(`> [!note]`)은 블로그에서 렌더링되지 않습니다.
  링크는 마크다운 링크(기본 설정), 강조 박스는 Chirpy 문법을 씁니다:

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
- `_includes/metadata-hook.html`, `assets/css/jekyll-theme-chirpy.scss`: Pretendard 폰트, 사이드바 스타일
- `_tabs/about.md`: 자기소개
- `.obsidian/`, `_templates/post.md`: Obsidian 볼트 설정(Obsidian Git 플러그인, 글 템플릿, 첨부 경로)

## 로컬에서 보기

```bash
bundle install
bundle exec jekyll serve
```
