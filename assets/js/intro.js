/*
  anime.js 등장 연출 (_includes/metadata-hook.html 에서 anime.js 4.5.0 다음에 불러옴)
  1. 사이드바 트리: 창(탭)을 처음 열었을 때 한 번, 가지 선이 그려지며 위에서부터 차례로 나타남
  2. 홈 배너: 사이트 밖에서 들어왔을 때 명령이 한 글자씩 입력되고 결과가 뜸. 배너를 누르면 다시 재생
  3. 홈 글 카드: 사이트 밖에서 들어왔을 때 화면에 보이는 카드부터 차례로 나타남
  어느 연출을 할지는 metadata-hook 의 인라인 스크립트가 <html> 에 intro-sidebar / intro-home 클래스로 정함.
  동작 줄이기 설정이면 위치는 움직이지 않고 나타나기(투명도)와 타이핑만 함.
*/
(function () {
  var root = document.documentElement;
  var a = window.anime;
  if (!a) {
    root.classList.remove('intro-sidebar', 'intro-home');
    return;
  }

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clean(targets) {
    targets.forEach(function (el) {
      el.style.removeProperty('opacity');
      el.style.removeProperty('transform');
      el.style.removeProperty('--sb-draw');
      el.style.removeProperty('width');
      if (el.getAttribute('style') === '') {
        el.removeAttribute('style');
      }
    });
  }

  /* 1. 사이드바 트리 */
  if (root.classList.contains('intro-sidebar')) {
    var rows = Array.prototype.slice.call(
      document.querySelectorAll('#sidebar .sb-root, #sidebar .sb-tree > li, #sidebar .sb-list > li')
    );
    a.utils.set(rows, still ? { opacity: 0 } : { opacity: 0, '--sb-draw': 0 });
    root.classList.remove('intro-sidebar');
    a.animate(rows, {
      opacity: [0, 1],
      x: still ? 0 : [-8, 0],
      '--sb-draw': still ? 1 : [0, 1],
      duration: still ? 260 : 380,
      delay: a.stagger(45, { start: 80 }),
      ease: still ? 'linear' : 'outCubic',
      onComplete: function () {
        clean(rows);
      }
    });
  }

  /* 2. 홈 배너 타이핑 */
  var banner = document.querySelector('.home-banner');
  var lines = banner ? Array.prototype.slice.call(banner.querySelectorAll('.term-body > p')) : [];
  var playing = false;

  function playBanner() {
    if (playing || lines.length === 0) {
      return;
    }
    playing = true;
    var tl = a.createTimeline({
      onComplete: function () {
        var cmds = Array.prototype.slice.call(banner.querySelectorAll('.cmd'));
        cmds.forEach(function (cmd) {
          cmd.classList.remove('is-typing');
        });
        clean(lines.concat(cmds));
        playing = false;
      }
    });

    a.utils.set(lines, { opacity: 0 });
    lines.forEach(function (p) {
      var cmd = p.querySelector('.cmd');
      var isOutput = p.classList.contains('out');
      if (cmd) {
        var n = cmd.textContent.length;
        cmd.classList.add('is-typing');
        a.utils.set(cmd, { width: '0ch' });
        tl.add(p, { opacity: 1, duration: 1 }, '+=120');
        tl.add(cmd, { width: [0 + 'ch', n + 'ch'], duration: n * 45, ease: a.steps(n, true) });
      } else if (isOutput) {
        tl.add(p, { opacity: [0, 1], y: still ? 0 : [4, 0], duration: 220, ease: 'outQuad' }, '+=80');
      } else {
        tl.add(p, { opacity: 1, duration: 1 }, '+=160');
      }
    });
  }

  if (banner) {
    if (root.classList.contains('intro-home')) {
      playBanner();
    }
    banner.title = '누르면 다시 재생';
    banner.style.cursor = 'pointer';
    banner.addEventListener('click', playBanner);
  }

  /* 3. 홈 글 카드 */
  var cards = Array.prototype.slice.call(document.querySelectorAll('#post-list .card-wrapper'));
  if (root.classList.contains('intro-home') && cards.length > 0 && 'IntersectionObserver' in window) {
    a.utils.set(cards, { opacity: 0 });
    var first = true;
    var io = new IntersectionObserver(
      function (entries) {
        var batch = entries
          .filter(function (e) {
            return e.isIntersecting;
          })
          .map(function (e) {
            io.unobserve(e.target);
            return e.target;
          });
        if (batch.length === 0) {
          return;
        }
        a.animate(batch, {
          opacity: [0, 1],
          y: still ? 0 : [16, 0],
          duration: still ? 300 : 450,
          delay: a.stagger(70, { start: first ? 250 : 0 }),
          ease: 'outCubic',
          onComplete: function () {
            clean(batch);
          }
        });
        first = false;
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    cards.forEach(function (c) {
      io.observe(c);
    });
  }

  root.classList.remove('intro-home');
})();
