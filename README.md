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

## 글 쓰기

`_posts/YYYY-MM-DD-영문-제목.md` 파일을 만들고 첫 줄에 아래처럼 적습니다.
`categories`의 첫 번째 값은 위 표의 카테고리 이름과 **정확히 같아야** 사이드바 메뉴에 글이 모입니다.

```yaml
---
title: "글 제목"
date: 2026-10-27 21:00:00 +0900
categories: [CTF/Wargame, Dreamhack]   # [대분류, 소분류]
tags: [web, xss]
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

## 로컬에서 보기

```bash
bundle install
bundle exec jekyll serve
```
