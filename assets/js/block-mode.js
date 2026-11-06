/*
  블록 모드 이스터에그: 소개 탭 '좋아하는 게임'의 마인크래프트 타일(.block-egg)을 누르면
  60초 동안 사이트가 픽셀 블록 느낌으로 바뀜 (스타일은 assets/css/jekyll-theme-chirpy.scss 의 "블록 모드").
  - 남은 시간은 sessionStorage 'block-mode-until' 에 저장해서 다른 페이지로 가도 이어짐
    (화면을 그리기 전에 _includes/metadata-hook.html 이 html.block-mode 클래스와 갈무리 글꼴을 미리 붙임)
  - 화면 왼쪽 아래 칩에 남은 초와 '끝내기' 버튼, 타일을 다시 눌러도 끝남
  - 켤 때 anime.js 로 작은 블록이 튀어 나옴 (동작 줄이기 설정이면 생략)
*/
(function () {
  var root = document.documentElement;
  var KEY = 'block-mode-until';
  var DURATION = 60000;
  var FONT_ID = 'galmuri-css';
  var FONT_HREF = 'https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css';
  var chip = null;
  var timer = null;

  function until() {
    try {
      return Number(sessionStorage.getItem(KEY)) || 0;
    } catch (e) {
      return 0;
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

  function stop() {
    root.classList.remove('block-mode');
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {}
    clearInterval(timer);
    if (chip) {
      chip.remove();
      chip = null;
    }
  }

  function tick() {
    var left = Math.ceil((until() - Date.now()) / 1000);
    if (left <= 0) {
      stop();
      return;
    }
    chip.querySelector('.block-chip-left').textContent = left;
  }

  function run() {
    loadFont();
    root.classList.add('block-mode');
    if (!chip) {
      chip = document.createElement('div');
      chip.className = 'block-chip';
      chip.setAttribute('role', 'status');
      chip.innerHTML = '블록 모드 · <span class="block-chip-left"></span>초 <button type="button">끝내기</button>';
      chip.querySelector('button').addEventListener('click', stop);
      document.body.appendChild(chip);
    }
    clearInterval(timer);
    tick();
    timer = setInterval(tick, 1000);
  }

  function burst(from) {
    var a = window.anime;
    if (!a || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    var box = from.getBoundingClientRect();
    var colors = ['#6aaa40', '#4b822c', '#79553a', '#593d29', '#7d7d7d'];
    var blocks = [];
    for (var i = 0; i < 16; i++) {
      var b = document.createElement('span');
      b.className = 'block-bit';
      b.style.left = box.left + box.width / 2 + 'px';
      b.style.top = box.top + box.height / 2 + 'px';
      b.style.background = colors[i % colors.length];
      document.body.appendChild(b);
      blocks.push(b);
    }
    blocks.forEach(function (b) {
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
    if (root.classList.contains('block-mode')) {
      stop();
      return;
    }
    try {
      sessionStorage.setItem(KEY, String(Date.now() + DURATION));
    } catch (err) {}
    run();
    burst(egg);
  });

  if (until() > Date.now()) {
    run();
  } else if (root.classList.contains('block-mode')) {
    stop();
  }
})();
