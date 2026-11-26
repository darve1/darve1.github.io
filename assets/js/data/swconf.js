---
layout: compress
permalink: '/:path/swconf.js'
# Chirpy v7.6.0 의 assets/js/data/swconf.js 를 덮어씀. 서비스 워커(sw.min.js)가 맨 먼저 읽는 설정 파일이고,
# 배포할 때마다 cacheName 이 바뀌어서 브라우저가 "새 판이 나왔다"는 것을 이 파일로 알아챔.
#
# 테마와 다른 점 두 가지: 서비스 워커가 파일을 받을 때 브라우저의 HTTP 캐시를 거치지 않게 함.
# GitHub Pages 는 모든 파일에 10분짜리 캐시(max-age=600)를 붙이는데, 테마 그대로면 새 판을 저장할 때
# 그 캐시에 남아 있던 이전 파일을 새 판으로 저장해 버려서, 배포 직후에 들어온 브라우저에는 다음 배포 때까지
# 옛 화면이 남을 수 있음.
# 1. 설치할 때 미리 받는 목록(resources): 주소 대신 cache: 'reload' 를 단 Request 로 넘김
# 2. 그 밖에 처음 받는 파일: fetch 를 감싸서 이 사이트의 파일은 cache: 'no-cache'(서버에 바뀌었는지 물어봄)로 받음
#
# 주의: compress 레이아웃이 줄바꿈을 없애므로 이 파일의 자바스크립트에는 // 주석을 쓰면 안 됨 (설명은 여기와 Liquid 주석에).
# 화살표 함수(=>)와 < > 연산자도 쓰지 않음 (compress 가 HTML 로 보고 건드릴 수 있음)
---

const swconf = {
  {% if site.pwa.cache.enabled %}
    cacheName: 'chirpy-{{ "now" | date: "%s" }}',

    {%- comment -%} 설치할 때 미리 받아 두는 파일. HTTP 캐시를 건너뛰고 서버에서 새로 받음 {%- endcomment -%}
    resources: [
      '{{ "/assets/css/:THEME.css" | replace: ':THEME', site.theme | relative_url }}',
      '{{ "/" | relative_url }}',
      {% for tab in site.tabs %}
        '{{- tab.url | relative_url -}}',
      {% endfor %}

      {% assign cache_list = site.static_files | where: 'swcache', true %}
      {% for file in cache_list %}
        '{{ file.path | relative_url }}'{%- unless forloop.last -%},{%- endunless -%}
      {% endfor %}
    ].map(function (url) { return new Request(url, { cache: 'reload' }); }),

    interceptor: {
      {%- comment -%} URLs containing the following paths will not be cached. {%- endcomment -%}
      paths: [
        {% for path in site.pwa.cache.deny_paths %}
          {% unless path == empty %}
            '{{ path | relative_url }}'{%- unless forloop.last -%},{%- endunless -%}
          {% endunless  %}
        {% endfor %}
      ],

      {%- comment -%} URLs containing the following prefixes will not be cached. {%- endcomment -%}
      urlPrefixes: [
        {% if site.analytics.goatcounter.id != nil and site.pageviews.provider == 'goatcounter' %}
          'https://{{ site.analytics.goatcounter.id }}.goatcounter.com/counter/'
        {% endif %}
      ]
    },

    purge: false
  {% else %}
    purge: true
  {% endif %}
};

{% if site.pwa.cache.enabled %}
  {%- comment -%}
    서비스 워커가 캐시에 없는 파일을 받을 때(sw.min.js 의 fetch(요청)): 이 사이트의 파일이면 HTTP 캐시를 그대로 믿지 않고
    서버에 바뀌었는지 물어봄. 다른 사이트(CDN)의 파일과 옵션을 직접 준 호출은 그대로 둠
  {%- endcomment -%}
  var nativeFetch = self.fetch;
  self.fetch = function (input, init) {
    if (!init && input instanceof Request && input.method === 'GET' && input.url.indexOf(self.location.origin + '/') === 0) {
      return nativeFetch(input, { cache: 'no-cache' });
    }
    return nativeFetch(input, init);
  };
{% endif %}
