/* MetroChat — мягкий фильтр нецензурных слов.
   Подключается из service worker, поэтому не трогает сам index.html. */
(function () {
  if (window.__metroGuard) return;
  window.__metroGuard = true;

  var STEMS = [
    'хуй', 'хуя', 'хую', 'хуе', 'хуё', 'нахуй', 'похуй',
    'пизд', 'бляд', 'блят', 'блядь',
    'ебат', 'ебал', 'ебан', 'ебуч', 'еби', 'заеб', 'уеб', 'наеб', 'выеб',
    'мудак', 'мудил', 'долбо', 'долба', 'сука', 'сучк', 'сучон',
    'пидор', 'пидар', 'педик', 'гандон', 'шлюх', 'жоп', 'срак', 'манда', 'мандо',
    'говно', 'говнюк', 'хер', 'курва'
  ];
  var EN = ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt'];
  var MAP = {
    '0': 'о', '1': 'и', '3': 'е', '4': 'ч', '6': 'б', '@': 'а', '$': 's',
    a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', x: 'х', y: 'у', k: 'к', t: 'т', h: 'н', b: 'в'
  };

  function norm(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .split('')
      .map(function (ch) { return MAP[ch] || ch; })
      .join('')
      .replace(/[^a-zа-я0-9]+/g, ' ')
      .replace(/(.)\1{2,}/g, '$1$1')
      .trim();
  }

  function isBad(text) {
    var clean = norm(text);
    if (!clean) return false;
    var words = clean.split(' ');
    for (var i = 0; i < words.length; i += 1) {
      var word = words[i];
      if (word.length < 3) continue;
      for (var j = 0; j < STEMS.length; j += 1) {
        if (word.indexOf(STEMS[j]) === 0) return true;
      }
      for (var k = 0; k < EN.length; k += 1) {
        if (word.indexOf(EN[k]) === 0) return true;
      }
    }
    return false;
  }

  function censor(text) {
    return String(text || '')
      .split(/(\s+)/)
      .map(function (chunk) {
        return isBad(chunk) ? new Array(Math.min(7, Math.max(3, chunk.length)) + 1).join('•') : chunk;
      })
      .join('');
  }

  function input() {
    return (
      document.querySelector('#chatInput') ||
      document.querySelector('textarea[placeholder]') ||
      document.querySelector('input[type="text"]')
    );
  }

  var tip = null;
  var tipTimer = 0;

  function hint(text) {
    try {
      if (!tip) {
        tip = document.createElement('div');
        tip.style.cssText =
          'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;padding:10px 16px;' +
          'border-radius:999px;background:#111827;color:#fff;font:13px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
          'box-shadow:0 12px 30px rgba(0,0,0,.35);opacity:0;transition:opacity .2s ease;pointer-events:none';
        document.body.appendChild(tip);
      }
      tip.textContent = text;
      tip.style.opacity = '1';
      clearTimeout(tipTimer);
      tipTimer = setTimeout(function () { tip.style.opacity = '0'; }, 2200);
    } catch (e) {
      /* без подсказки тоже работает */
    }
  }

  function fix(field) {
    if (!field || typeof field.value !== 'string') return false;
    if (!isBad(field.value)) return false;
    field.value = censor(field.value);
    try {
      field.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {}
    hint('Грубые слова заменены — пожалуйста, без мата');
    return true;
  }

  document.addEventListener(
    'keydown',
    function (event) {
      if (event.key !== 'Enter' || event.shiftKey) return;
      var field = event.target;
      if (field && typeof field.value === 'string') fix(field);
    },
    true,
  );

  document.addEventListener(
    'click',
    function (event) {
      var button = event.target && event.target.closest ? event.target.closest('button, [role="button"]') : null;
      if (!button) return;
      var label = (
        (button.id || '') + ' ' + (button.className || '') + ' ' + (button.getAttribute('aria-label') || '')
      ).toLowerCase();
      if (!/send|отправ|submit|arrow|paper/.test(label)) return;
      fix(input());
    },
    true,
  );

  document.addEventListener(
    'input',
    function (event) {
      var field = event.target;
      if (field && typeof field.value === 'string' && isBad(field.value)) {
        hint('Пожалуйста, без грубых слов');
      }
    },
    true,
  );

  window.metroGuard = { isBad: isBad, censor: censor };
})();
