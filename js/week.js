const weekElement = (id) => document.getElementById(id);
const weekEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const days = Array.from({ length: 7 }, (_, index) => `Giorno ${index + 1}`);
const mealColumns = [
  { name: 'Colazione', short: 'Colaz.', category: 'Colazione', icon: 'coffee' },
  { name: 'Spuntino mattina', short: 'AM', category: 'Spuntino', icon: 'apple' },
  { name: 'Pranzo', short: 'Pranzo', category: 'Pranzo', icon: 'utensils' },
  { name: 'Spuntino pomeriggio', short: 'PM', category: 'Spuntino', icon: 'cherry' },
  { name: 'Cena', short: 'Cena', category: 'Cena', icon: 'moon' },
];
const weekState = { dishes: [], meals: [], schedule: [], source: '', selected: null };
const weekStorageKey = 'dispensa-week-v2';
const weekIcons = () => window.lucide?.createIcons();
const dishAt = (day, column) => weekState.dishes.find((dish) => dish.Piatto_ID === weekState.schedule[day]?.[column]);
const mealsAt = (meals, day, column) => meals.filter((meal) => meal.Giorno === days[day] && meal.Tipo_Pasto.toLocaleLowerCase('it') === mealColumns[column].name.toLocaleLowerCase('it'));
const typeMarkup = (type) => `<span class="type-label" data-type="${weekEscape(type)}">${type ? `Tipo ${weekEscape(type)}` : 'Senza tipo'}</span>`;

function initialSchedule(meals) {
  if (!Array.isArray(meals) || meals.length !== 35 || meals.some((meal) => typeof meal.Tipo_Pasto !== 'string')) throw new Error('Calendario dei pasti non valido.');
  return days.map((day, dayIndex) => mealColumns.map((column, columnIndex) => {
    const slots = mealsAt(meals, dayIndex, columnIndex);
    if (slots.length !== 1) throw new Error(`Pasto mancante o duplicato: ${day}, ${column.name}.`);
    return slots[0].Piatto_ID;
  }));
}

function validSchedule(schedule) {
  return Array.isArray(schedule) && schedule.length === 7 && schedule.every((row) =>
    Array.isArray(row) && row.length === 5 && row.every((id, column) =>
      weekState.dishes.some((dish) => dish.Piatto_ID === id && dish.Categoria === mealColumns[column].category)));
}

function renderBoard() {
  weekElement('board-body').innerHTML = days.map((day, dayIndex) => `<tr><th scope="row" aria-label="${day}"><span class="day-short">G${dayIndex + 1}</span></th>${mealColumns.map((column, columnIndex) => {
    const dish = dishAt(dayIndex, columnIndex);
    return `<td><button class="meal-tile" type="button" title="${weekEscape(dish.Nome_Piatto)}" data-day="${dayIndex}" data-column="${columnIndex}" data-type="${weekEscape(dish.Type)}" aria-pressed="false" aria-label="${weekEscape(`${day}, ${column.name}: ${dish.Nome_Piatto}, ${dish.Type ? `tipo ${dish.Type}` : 'senza tipo'}`)}"><span class="meal-name">${weekEscape(dish.Nome_Piatto)}</span>${dish.Type ? `<span class="tile-type">${weekEscape(dish.Type)}</span>` : ''}</button></td>`;
  }).join('')}</tr>`).join('');
  updateSelection();
}

function updateSelection() {
  const selection = weekState.selected;
  const dish = selection ? dishAt(selection.day, selection.column) : null;
  let matching = 0;
  document.querySelectorAll('.meal-tile').forEach((button) => {
    const selected = Boolean(selection && Number(button.dataset.day) === selection.day && Number(button.dataset.column) === selection.column);
    const sameType = Boolean(dish?.Type && button.dataset.type === dish.Type);
    if (sameType) matching += 1;
    button.classList.toggle('same-type', sameType && !selected);
    button.classList.toggle('selected', selected);
    button.classList.toggle('dimmed', Boolean(dish && !selected && button.dataset.type !== dish.Type));
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('#type-legend .type-label').forEach((label) => label.classList.toggle('active-type', Boolean(dish?.Type && label.dataset.type === dish.Type)));
  const detailOpen = !weekElement('meal-view').hidden;
  weekElement('selection-bar').hidden = !dish || detailOpen;
  document.body.classList.toggle('has-selection', Boolean(dish && !detailOpen));
  weekElement('selection-status').textContent = !dish ? '35 pasti' : dish.Type ? `Tipo ${dish.Type} · ${matching} pasti nella settimana` : 'Piatto senza tipo';
  if (!dish) return;
  weekElement('selected-context').textContent = `${days[selection.day]} · ${mealColumns[selection.column].name}`;
  weekElement('selected-title').textContent = dish.Nome_Piatto;
  weekElement('open-meal').href = `#meal=${selection.day}-${selection.column}`;
}

function renderRoute() {
  if (!weekState.dishes.length) return;
  const route = /^#meal=([0-6])-([0-4])$/.exec(location.hash);
  document.body.classList.toggle('board-mode', !route);
  weekElement('board-view').hidden = Boolean(route);
  weekElement('meal-view').hidden = !route;
  if (!route) {
    document.title = 'Dispensa | La settimana';
    updateSelection();
    if (weekState.selected) {
      const { day, column } = weekState.selected;
      document.querySelector(`[data-day="${day}"][data-column="${column}"]`)?.focus({ preventScroll: true });
    }
    return;
  }
  const day = Number(route[1]);
  const column = Number(route[2]);
  weekState.selected = { day, column };
  const dish = dishAt(day, column);
  document.title = `${dish.Nome_Piatto} | Dispensa`;
  weekElement('meal-title').textContent = dish.Nome_Piatto;
  weekElement('meal-context').textContent = `${days[day]} / ${mealColumns[column].name}`;
  weekElement('meal-tags').innerHTML = `${typeMarkup(dish.Type)}<span class="recipe-id">${weekEscape(dish.Piatto_ID)} · ${weekEscape(dish.Categoria)}</span>`;
  const ingredients = Array.isArray(dish.ingredients) ? dish.ingredients : [];
  weekElement('meal-ingredients').innerHTML = ingredients.map((ingredient) => `<li class="recipe-ingredient"><div><span class="ingredient-name">${weekEscape(ingredient.name)}</span>${ingredient.notes ? `<span class="ingredient-note">${weekEscape(ingredient.notes)}</span>` : ''}</div><span class="ingredient-quantity">${weekEscape(ingredient.quantity || 'Non indicata')}</span></li>`).join('');
  weekElement('ingredients-empty').hidden = ingredients.length > 0;
  weekElement('meal-recipe').textContent = dish.Istruzioni_Preparazione_Ricetta || 'Preparazione non indicata.';
  const meal = mealsAt(weekState.meals, day, column)[0];
  weekElement('meal-notes-section').hidden = !meal.Note_Pasto;
  weekElement('meal-notes').textContent = meal.Note_Pasto || '';
  weekElement('meal-choice').innerHTML = weekState.dishes.filter((option) => option.Categoria === dish.Categoria).map((option) => `<option value="${weekEscape(option.Piatto_ID)}">${weekEscape(option.Nome_Piatto)}</option>`).join('');
  weekElement('meal-choice').value = dish.Piatto_ID;
  weekElement('save-status').textContent = '';
  updateSelection();
  weekElement('meal-view').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

async function loadWeek() {
  weekElement('loading').hidden = false;
  weekElement('week-error').hidden = true;
  try {
    const [dishResponse, mealResponse] = await Promise.all([
      fetch(document.body.dataset.dishesUrl || '/api/dishes'),
      fetch(document.body.dataset.mealsUrl || '/api/meals'),
    ]);
    if (!dishResponse.ok || !mealResponse.ok) throw new Error(`Errore ${!dishResponse.ok ? dishResponse.status : mealResponse.status}`);
    const [dishes, meals] = await Promise.all([dishResponse.json(), mealResponse.json()]);
    if (!Array.isArray(dishes) || !dishes.length || dishes.some((dish) => !dish.Piatto_ID || !dish.Nome_Piatto || typeof dish.Type !== 'string') || mealColumns.some((column) => !dishes.some((dish) => dish.Categoria === column.category))) throw new Error('Dati dei piatti non validi.');
    weekState.dishes = dishes;
    weekState.schedule = initialSchedule(meals);
    if (!validSchedule(weekState.schedule)) throw new Error('Riferimento al piatto non valido nel calendario.');
    weekState.meals = meals;
    weekState.source = JSON.stringify(meals);
    try {
      const saved = JSON.parse(localStorage.getItem(weekStorageKey));
      if (saved?.source === weekState.source && validSchedule(saved.schedule)) weekState.schedule = saved.schedule;
    } catch {}
    weekElement('board-head').innerHTML = `<tr><th scope="col" class="day-heading"><span class="sr-only">Giorno</span></th>${mealColumns.map((column) => `<th scope="col" aria-label="${column.name}" title="${column.name}"><i data-lucide="${column.icon}" aria-hidden="true"></i><span>${column.short}</span></th>`).join('')}</tr>`;
    const types = [...new Set(dishes.map((dish) => dish.Type).filter(Boolean))].sort((first, second) => first.localeCompare(second, 'it', { numeric: true }));
    weekElement('type-legend').innerHTML = types.map(typeMarkup).join('') + typeMarkup('');
    renderBoard();
    renderRoute();
  } catch (error) {
    weekElement('week-error-message').textContent = error.message;
    weekElement('week-error').hidden = false;
  } finally {
    weekElement('loading').hidden = true;
    weekIcons();
  }
}

weekElement('board-body').addEventListener('click', (event) => {
  const button = event.target.closest('.meal-tile');
  if (!button) return;
  const day = Number(button.dataset.day);
  const column = Number(button.dataset.column);
  weekState.selected = weekState.selected?.day === day && weekState.selected?.column === column ? null : { day, column };
  updateSelection();
});
weekElement('clear-selection').addEventListener('click', () => {
  const selection = weekState.selected;
  weekState.selected = null;
  updateSelection();
  if (selection) document.querySelector(`[data-day="${selection.day}"][data-column="${selection.column}"]`)?.focus({ preventScroll: true });
});
weekElement('meal-choice').addEventListener('change', (event) => {
  if (!weekState.selected) return;
  const { day, column } = weekState.selected;
  const dish = weekState.dishes.find((option) => option.Piatto_ID === event.target.value && option.Categoria === mealColumns[column].category);
  if (!dish) return;
  weekState.schedule[day][column] = dish.Piatto_ID;
  let saved = true;
  try { localStorage.setItem(weekStorageKey, JSON.stringify({ source: weekState.source, schedule: weekState.schedule })); } catch { saved = false; }
  renderBoard();
  renderRoute();
  weekElement('meal-choice').focus({ preventScroll: true });
  weekElement('save-status').textContent = saved ? 'Settimana aggiornata.' : 'Piatto aggiornato. Salvataggio sul dispositivo non disponibile.';
});
window.addEventListener('hashchange', renderRoute);
weekElement('week-retry').addEventListener('click', loadWeek);
loadWeek();