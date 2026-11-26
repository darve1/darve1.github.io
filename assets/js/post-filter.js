/*
  글 목록 걸러 보기 (홈, 카테고리 화면). 오른쪽 칸에서 고르면 왼쪽 목록이 그것에 해당하는 글만으로 바뀜.
  - 태그 (오른쪽 칸의 a[data-filter="tag:이름"]): 그 태그가 붙은 글만
  - 날짜 (홈의 달력 .cal, _includes/home-side.html): 그날 올린 글만
  고른 것은 주소 뒤의 # 에 남음 (#tag:pwnable, #2026-11-24). 그래서 뒤로 가기가 되고 그 주소를 그대로 공유할 수 있음.
  고른 것을 다시 누르거나 "전체 글 보기"를 누르면 원래 목록으로 돌아옴.

  글은 화면의 칸(.post-row)에서 읽음: data-date(올린 날), data-tags(태그들, | 로 구분). 칸의 마크업은 _includes/post-row.html
  - 홈: <template id="all-rows"> 에 든 전체 글 (쪽이 나뉘어 있어도 다른 쪽의 글까지 걸러 보이게)
  - 카테고리 화면: 화면에 나와 있는 목록(.all-stack)이 곧 전체

  달력: 글을 쓴 날 = GitHub 잔디처럼 초록 칸(그날 글이 많을수록 진함: data-level 1~3), 오늘 = 테두리,
  좌우 버튼으로 달을 넘김, 표 아래에는 보고 있는 달의 글 수
*/
(() => {
  const allStack = document.querySelector('.all-stack');
  const bar = document.querySelector('.day-filter');
  if (!allStack || !bar) return;

  const source = document.getElementById('all-rows');
  const rows = [...(source ? source.content : allStack).querySelectorAll('.post-row')];
  const barLabel = bar.querySelector('.day-filter-label');
  const pickStack = document.querySelector('.day-stack'); // 걸러 낸 글이 들어가는 자리
  const pager = document.querySelector('.home-pager');
  const fullDate = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' });

  // 주소의 # 뒤 → 무엇으로 거르는지. 날짜나 tag: 로 시작하는 것만 알아봄
  function readHash() {
    const text = decodeURIComponent(location.hash.slice(1));
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { kind: 'date', value: text, key: text };
    if (text.startsWith('tag:')) return { kind: 'tag', value: text.slice(4), key: text };
    return null;
  }

  const matches = (row, pick) =>
    pick.kind === 'date' ? row.dataset.date === pick.value : row.dataset.tags.split('|').includes(pick.value);

  function label(pick, count) {
    if (pick.kind === 'tag') return `#${pick.value} 태그가 붙은 글 ${count}개`;
    const [year, month, day] = pick.value.split('-').map(Number);
    return `${fullDate.format(new Date(year, month - 1, day))}에 올린 글 ${count}개`;
  }

  const calendar = setUpCalendar(document.querySelector('.cal'));

  function apply() {
    let pick = readHash();
    const picked = pick ? rows.filter((row) => matches(row, pick)) : [];
    if (picked.length === 0) pick = null; // 해당하는 글이 없는 주소면 평소 목록

    bar.hidden = pickStack.hidden = !pick;
    allStack.hidden = Boolean(pick);
    if (pager) pager.hidden = Boolean(pick);
    pickStack.replaceChildren(...picked.map((row) => row.cloneNode(true)));
    if (pick) barLabel.textContent = label(pick, picked.length);

    // 오른쪽 칸의 태그: 고른 것을 표시하고, 다시 누르면 전체 글로 돌아가게 주소를 바꿔 둠
    for (const link of document.querySelectorAll('a[data-filter]')) {
      const on = pick?.key === link.dataset.filter;
      link.classList.toggle('is-selected', on);
      link.setAttribute('href', on ? '#post-list' : `#${encodeURIComponent(link.dataset.filter)}`);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    calendar?.select(pick?.kind === 'date' ? pick.value : null);

    // 오른쪽 칸이 목록 아래에 있는 좁은 화면: 바뀐 목록이 보이게 올려 줌
    if (pick) {
      const { top, bottom } = bar.getBoundingClientRect();
      if (bottom < 0 || top > innerHeight) bar.scrollIntoView({ block: 'start' });
    }
  }

  addEventListener('hashchange', apply);
  apply();

  function setUpCalendar(root) {
    if (!root) return null;

    // 날짜('2026-11-26') → 그날 올린 글의 칸들 (최신 글이 앞)
    const byDay = new Map();
    for (const row of rows) byDay.set(row.dataset.date, [...(byDay.get(row.dataset.date) ?? []), row]);

    const key = (date) =>
      [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
    const todayKey = key(new Date());
    const titles = (list) => list.map((row) => row.querySelector('.pr-title').textContent.trim()).join('\n');

    const monthLabel = root.querySelector('.cal-label');
    const total = root.querySelector('.cal-count'); // 보고 있는 달의 글 수
    const monthName = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' });

    // 표 머리(요일)까지 여기서 만듦. 2023-01-01 이 일요일이라 거기서부터 7일의 요일 이름을 뽑음
    const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'narrow' });
    const table = document.createElement('table');
    table.className = 'cal-grid';
    const head = table.createTHead().insertRow();
    for (let i = 1; i <= 7; i++) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = weekday.format(new Date(2023, 0, i));
      head.append(th);
    }
    const body = table.createTBody();
    root.querySelector('.cal-slot').append(table);

    let view = new Date(); // 달력이 보여 주는 달 (그 달의 1일)
    view.setDate(1);
    let selected = null; // 목록에 그날 글만 보여 주고 있는 날짜, 없으면 null

    function dayCell(date) {
      const td = document.createElement('td');
      const day = key(date);
      const list = byDay.get(day);
      const el = document.createElement(list ? 'a' : 'span');
      el.textContent = date.getDate();
      if (list) {
        // 고른 날을 다시 누르면 전체 글로 돌아감
        el.href = day === selected ? '#post-list' : `#${day}`;
        el.title = titles(list);
        el.dataset.level = Math.min(list.length, 3);
        el.classList.toggle('is-selected', day === selected);
      }
      if (day === todayKey) el.setAttribute('aria-current', 'date');
      td.append(el);
      return td;
    }

    function render() {
      const year = view.getFullYear();
      const month = view.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      monthLabel.textContent = monthName.format(view);

      const cells = Array.from({ length: view.getDay() }, () => document.createElement('td'));
      let count = 0;
      for (let day = 1; day <= days; day++) {
        const date = new Date(year, month, day);
        count += byDay.get(key(date))?.length ?? 0;
        cells.push(dayCell(date));
      }
      total.textContent = `글 ${count}개`;

      const trs = [];
      for (let i = 0; i < cells.length; i += 7) {
        const tr = document.createElement('tr');
        tr.append(...cells.slice(i, i + 7));
        trs.push(tr);
      }
      body.replaceChildren(...trs);
    }

    root.addEventListener('click', (event) => {
      const button = event.target.closest('.cal-nav');
      if (!button) return;
      view = new Date(view.getFullYear(), view.getMonth() + Number(button.dataset.step), 1);
      render();
    });

    return {
      // 고른 날을 표시하고 달력을 그 달로 옮김 (null 이면 표시만 지움)
      select(day) {
        selected = day;
        if (day) {
          const [year, month] = day.split('-').map(Number);
          view = new Date(year, month - 1, 1);
        }
        render();
      },
    };
  }
})();
