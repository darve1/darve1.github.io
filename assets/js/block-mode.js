/*
  블록 모드 이스터에그: 소개 탭 '좋아하는 게임'의 마인크래프트 타일(.block-egg)을 누르면 켜지고,
  다시 누르거나 '끝내기'를 누르거나 새로고침할 때까지 모든 페이지에서 유지됨.
  (스타일은 assets/css/jekyll-theme-chirpy.scss 의 "블록 모드")
  - 켜짐 여부는 sessionStorage 'block-mode' 에 저장. 화면을 그리기 전에 _includes/metadata-hook.html 이
    html.block-mode 클래스와 갈무리 글꼴을 미리 붙이고, 새로고침이면 저장값을 지움
  - 핫바: 화면 아래 9칸(홈, 카테고리 7개, 소개). 숫자 키 1~9로 이동, 지금 보는 칸은 흰 테두리
  - 켜고 끌 때 누른 자리에서 화면이 블록 계단 모양 원으로 번지며 바뀜 (View Transitions, 동작 줄이기면 바로 바뀜)
  - 켤 때 anime.js 로 작은 블록이 튀어 나옴 (동작 줄이기면 생략)
*/
(function () {
  var root = document.documentElement;
  var KEY = 'block-mode';
  var FONT_ID = 'galmuri-css';
  var FONT_HREF = 'https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css';
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ui = null;

  function store(on) {
    try {
      if (on) {
        sessionStorage.setItem(KEY, '1');
      } else {
        sessionStorage.removeItem(KEY);
      }
    } catch (e) {}
  }

  function stored() {
    try {
      return sessionStorage.getItem(KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function loadFont() {
    if (!document.getElementById(FONT_ID)) {
      var link = document.createElement('link');
      link.id = FONT_ID;
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }

  /* 핫바 칸: 사이드바 메뉴에서 홈, 카테고리 7개, 소개를 가져옴 */
  function slots() {
    var list = [];
    var home = document.querySelector('#sidebar .sb-root');
    if (home) {
      list.push({ href: home.href, name: '홈', kind: 'home', current: home.classList.contains('active') });
    }
    document.querySelectorAll('#sidebar .sb-tree > li').forEach(function (li) {
      var a = li.querySelector(':scope > a.sb-row');
      list.push({
        href: a.href,
        name: a.querySelector('.sb-label').textContent.trim(),
        kind: 'cat',
        category: li.getAttribute('data-category'),
        current: li.classList.contains('active') || li.classList.contains('in-path')
      });
    });
    document.querySelectorAll('#sidebar .sb-list a.sb-row').forEach(function (a) {
      if (/\/about\/$/.test(a.pathname)) {
        list.push({ href: a.href, name: a.textContent.trim(), kind: 'about', current: a.hasAttribute('aria-current') });
      }
    });
    return list.slice(0, 9);
  }

  function buildUI() {
    var wrap = document.createElement('div');
    wrap.className = 'block-ui';

    var name = document.createElement('p');
    name.className = 'hb-name';
    name.setAttribute('aria-hidden', 'true');

    var bar = document.createElement('nav');
    bar.className = 'block-hotbar';
    bar.setAttribute('aria-label', '블록 모드 빠른 이동 (숫자 키 1~9)');

    slots().forEach(function (s, i) {
      var a = document.createElement('a');
      a.className = 'hb-slot hb-' + s.kind;
      a.href = s.href;
      a.setAttribute('aria-label', i + 1 + ' ' + s.name);
      if (s.current) {
        a.setAttribute('aria-current', 'page');
      }
      var icon = document.createElement('span');
      icon.className = 'hb-icon';
      if (s.category) {
        icon.setAttribute('data-category', s.category);
      }
      var key = document.createElement('span');
      key.className = 'hb-key';
      key.textContent = i + 1;
      a.appendChild(icon);
      a.appendChild(key);
      var show = function () {
        name.textContent = s.name;
        name.classList.add('is-on');
      };
      var hide = function () {
        name.classList.remove('is-on');
      };
      a.addEventListener('mouseenter', show);
      a.addEventListener('focus', show);
      a.addEventListener('mouseleave', hide);
      a.addEventListener('blur', hide);
      bar.appendChild(a);
    });

    var exit = document.createElement('button');
    exit.type = 'button';
    exit.className = 'hb-exit';
    exit.textContent = '끝내기';
    exit.title = '새로고침해도 끝나요';
    exit.addEventListener('click', function () {
      toggle(false, exit);
    });

    wrap.appendChild(name);
    wrap.appendChild(bar);
    wrap.appendChild(exit);
    return wrap;
  }

  function showUI(on) {
    if (on && !ui) {
      ui = buildUI();
      document.body.appendChild(ui);
    } else if (!on && ui) {
      ui.remove();
      ui = null;
    }
  }

  function apply(on) {
    if (on) {
      loadFont();
    }
    root.classList.toggle('block-mode', on);
    store(on);
    showUI(on);
  }

  /* 누른 자리(from)를 중심으로 계단 모양 원이 커지며 새 화면이 드러남 */
  function toggle(on, from) {
    if (still || !document.startViewTransition || !from) {
      apply(on);
      return;
    }
    var box = from.getBoundingClientRect();
    var x = box.left + box.width / 2;
    var y = box.top + box.height / 2;
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('block-wipe');
    var vt = document.startViewTransition(function () {
      apply(on);
    });
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 650, easing: 'steps(12, end)', pseudoElement: '::view-transition-new(root)' }
      );
    });
    vt.finished.finally(function () {
      root.classList.remove('block-wipe');
    });
  }

  function burst(from) {
    var a = window.anime;
    if (!a || still) {
      return;
    }
    var box = from.getBoundingClientRect();
    var colors = ['#6aaa40', '#4b822c', '#79553a', '#593d29', '#7d7d7d'];
    colors.concat(colors, colors).slice(0, 16).forEach(function (color) {
      var b = document.createElement('span');
      b.className = 'block-bit';
      b.style.left = box.left + box.width / 2 + 'px';
      b.style.top = box.top + box.height / 2 + 'px';
      b.style.background = color;
      document.body.appendChild(b);
      a.animate(b, {
        x: a.utils.random(-150, 150),
        y: [
          { to: a.utils.random(-170, -70), duration: 360, ease: 'outQuad' },
          { to: a.utils.random(90, 240), duration: 620, ease: 'inQuad' }
        ],
        rotate: a.utils.random(-200, 200),
        opacity: [
          { to: 1, duration: 700 },
          { to: 0, duration: 280 }
        ],
        onComplete: function () {
          b.remove();
        }
      });
    });
  }

  document.addEventListener('click', function (e) {
    var egg = e.target.closest('.block-egg');
    if (!egg) {
      return;
    }
    var on = !root.classList.contains('block-mode');
    toggle(on, egg);
    if (on) {
      burst(egg);
    }
  });

  /* 숫자 키 1~9: 핫바 칸으로 이동 (입력 중이거나 조합 키를 누른 경우는 무시) */
  document.addEventListener('keydown', function (e) {
    if (!ui || e.ctrlKey || e.metaKey || e.altKey || !/^[1-9]$/.test(e.key)) {
      return;
    }
    var t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
      return;
    }
    var slot = ui.querySelectorAll('.hb-slot')[Number(e.key) - 1];
    if (slot) {
      slot.click();
    }
  });

  if (stored()) {
    apply(true);
  } else if (root.classList.contains('block-mode')) {
    apply(false);
  }
})();
