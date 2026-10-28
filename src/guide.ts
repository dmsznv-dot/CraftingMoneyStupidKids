import type {BlockType} from './core.ts';
type Lang='ru'|'en';
type Copy=Record<Lang,string>;
type Entry={type:BlockType;name:Copy;description:Copy};
const entry=(type:BlockType,ru:string,en:string,ruDesc:string,enDesc:string):Entry=>({type,name:{ru,en},description:{ru:ruDesc,en:enDesc}});
export const atlasGroups:{title:Copy;entries:Entry[]}[]=[
 {title:{ru:'Породы и опасности',en:'Terrain and hazards'},entries:[
  entry('dirt','Земля','Dirt','Расходует прочность кирки при ударах.','Wears down your pick when struck.'),
  entry('stone','Камень','Stone','Прочнее земли и сильнее изнашивает кирку.','Tougher than dirt and causes more wear.'),
  entry('hard','Плотная порода','Dense rock','Для уверенной добычи нужна железная кирка или лучше.','An iron pick or better mines it reliably.'),
  entry('obsidian','Обсидиан','Obsidian','Поддаётся алмазной кирке и лучше; взрыв его не разрушает.','Requires a diamond pick or better; resistant to explosions.'),
  entry('bedrock','Коренная порода','Bedrock','Неразрушима — придётся обойти.','Indestructible; find a way around it.'),
  entry('tnt','Динамит','TNT','Взрыв разрушает соседние блоки и поджигает соседний TNT.','Explodes nearby blocks and lights adjacent TNT.'),
 ]},
 {title:{ru:'Руды',en:'Ores'},entries:[
  entry('coal','Уголь','Coal','Доступен деревянной кирке.','Mineable with a wooden pick.'),
  entry('copper','Медь','Copper','Доступна деревянной кирке.','Mineable with a wooden pick.'),
  entry('iron','Железо','Iron ore','Для добычи нужна каменная кирка или лучше.','Requires a stone pick or better.'),
  entry('gold','Золото','Gold ore','Для добычи нужна каменная кирка или лучше.','Requires a stone pick or better.'),
  entry('gem','Кристалл','Crystal ore','Для добычи нужна железная кирка или лучше.','Requires an iron pick or better.'),
  entry('emerald','Изумруд','Emerald ore','Для добычи нужна алмазная кирка или лучше.','Requires a diamond pick or better.'),
  entry('ancient','Древняя руда','Ancient ore','Для добычи нужна незеритовая кирка.','Requires a netherite pick.'),
 ]},
 {title:{ru:'Бонусы и предметы',en:'Bonuses and items'},entries:[
  entry('double','Двойная добыча','Double ore','Удваивает награду за следующие 5 блоков руды.','Doubles rewards from the next 5 ore blocks.'),
  entry('sweep','Очистка ряда','Row clear','Очищает ряд блоков и поджигает TNT.','Clears a row and lights TNT.'),
  entry('repair','Восстановление','Repair','Восстанавливает 1 единицу прочности.','Restores 1 durability.'),
  entry('onehit','Один удар','One hit','На 5 секунд ломает блоки с одного удара.','Breaks blocks in one hit for 5 seconds.'),
  entry('phase','Фаза','Phase','На 3 секунды кирка проходит сквозь блоки.','The pick passes through blocks for 3 seconds.'),
  entry('bench','Верстак','Workbench','Улучшает кирку на один тип до конца забега. У последней кирки добавляет 50% прочности. Один за забег.','Upgrades the pick for this run; the last pick gains 50% durability. One per run.'),
  entry('drill','Бур','Drill','Число на блоке показывает силу: до 4, 7 или 10 блоков. Цвет меняется с глубиной.','The number shows its strength: up to 4, 7 or 10 blocks. Color changes with depth.'),
  entry('magnet','Магнит','Magnet','Притягивает кирку на 1,5, 2 или 3 секунды; оттенок меняется с глубиной.','Attracts the pick for 1.5, 2 or 3 seconds; color changes with depth.'),
  entry('curse','Проклятие','Curse','Отнимает 25% максимальной прочности.','Removes 25% of maximum durability.'),
  entry('shield','Щит','Shield','На 5 секунд защищает от износа при ударах.','Prevents impact wear for 5 seconds.'),
  entry('coalCharge','Угольный заряд','Coal charge','Поджигает ближайший TNT.','Lights nearby TNT.'),
  entry('vein','Денежная жила','Money vein','Даёт случайную награду наггетами.','Awards a random number of nuggets.'),
  entry('helmet','Шахтёрская каска','Miner’s helmet','Один раз за забег спасает от поломки и возвращает 25% прочности.','Once per run, saves the pick and restores 25% durability.'),
  entry('relic','Осколок','Shard','Редкий осколок сохраняется после спуска.','A rare shard saved after the run.'),
 ]},
];
export const guideCopy={
 ru:{how:'Как играть?',atlas:'Атлас блоков',back:'Назад',intro:'Спускайся как можно глубже, добывай руду и улучшай кирку.',steps:[['Начало','Коснись верхней части шахты, чтобы выбрать место спуска, затем нажми кнопку с киркой.'],['Во время спуска','Кирка падает и добывает блоки сама. Стрелки или кнопки ← и → дают толчок; число толчков зависит от кирки.'],['Способности','Выбери зачарование в мастерской. В забеге нажми центральную кнопку или E, чтобы применить способность.'],['Прочность и добыча','Удары изнашивают кирку. Наггеты за добытую руду сохраняются; улучшай кирки и зачарования в мастерской.'],['Достижения','В меню с кубком можно забрать награды за выполненные достижения.']]},
 en:{how:'How to play?',atlas:'Block atlas',back:'Back',intro:'Dig as deep as you can, collect ore and upgrade your pick.',steps:[['Start','Tap the top of the mine to choose a drop point, then press the pick button.'],['During a run','The pick falls and mines automatically. Use the arrow buttons or ← and → to nudge it; the number of nudges depends on the pick.'],['Abilities','Choose an enchantment in the workshop. During a run, press the center button or E to use its ability.'],['Durability and mining','Impacts wear down your pick. Nuggets from mined ore are saved; upgrade picks and enchantments in the workshop.'],['Achievements','Open the trophy menu to claim rewards for completed achievements.']]},
};
