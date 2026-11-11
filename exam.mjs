import { bookLabel, readVocabulary } from './vocabularyData.mjs';

const byId = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text) result.textContent = text;
    return result;
}

function renderCell(char, pronunciation, blank) {
    const cell = node('span', 'exam-cell');
    const grid = node('span', 'exam-grid', blank ? '' : char);
    if (blank) {
        grid.setAttribute('role', 'img');
        grid.setAttribute('aria-label', '填空');
    }
    const reading = node('span', 'exam-zhuyin');
    reading.setAttribute('role', 'img');
    reading.setAttribute('aria-label', pronunciation);
    const tone = pronunciation.match(/[ˊˇˋ˙]/u)?.[0];
    if (tone) reading.append(node('span', `exam-tone${tone === '˙' ? ' neutral' : ''}`, tone));
    for (const symbol of pronunciation.replace(/[ˊˇˋ˙]/u, '')) reading.append(node('span', 'symbol', symbol));
    cell.append(grid, reading);
    return cell;
}

function renderPage(exam, offset, perPage, answer) {
    const title = answer ? '詞語測驗解答' : '看注音寫國字';
    const page = node('article', 'exam-page');
    page.setAttribute('aria-label', `${title}，第 ${offset / perPage + 1} 頁`);
    const header = node('div', 'exam-sheet-header');
    header.append(node('h2', '', title), node('p', 'exam-metadata',
        `${bookLabel(exam.book)}　第 ${exam.from}～${exam.to} 課`));
    if (!answer) header.append(node('p', 'exam-name', '姓名＿＿＿＿＿＿　日期＿＿＿＿＿＿'));
    const list = node('ol', 'exam-questions');
    list.start = offset + 1;
    const questions = exam.questions.slice(offset, offset + perPage);
    if (questions.length >= 8 && questions.every(question => Array.from(question.word).length <= 4)) {
        list.classList.add('short-questions');
        list.style.setProperty('--column-rows', String(Math.ceil(questions.length / 2)));
    }
    for (const [index, question] of questions.entries()) {
        const item = node('li', 'exam-question');
        item.dataset.number = String(offset + index + 1);
        const word = node('span', 'exam-word');
        for (const [position, char] of Array.from(question.word).entries()) {
            word.append(renderCell(char, question.pronunciation[position], !answer && question.blanks.includes(position + 1)));
        }
        item.append(word);
        if (answer) {
            const [first, ...others] = question.sources;
            const source = node('span', 'exam-sources', `第 ${first.lesson} 課${others.length ? `（另 ${others.length} 課）` : ''}`);
            source.title = question.sources.map(entry => `第 ${entry.lesson} 課`).join('、');
            item.append(source);
        }
        list.append(item);
    }
    const footer = node('footer', 'exam-footer');
    footer.append(node('span', '', `${exam.count} 題`),
        node('span', '', `第 ${offset / perPage + 1}／${Math.ceil(exam.count / perPage)} 頁`));
    page.append(header, list, footer);
    return page;
}

try {
    const exam = readVocabulary().exams.find(record => record.id === params.get('id'));
    if (!exam) throw new Error('這個瀏覽器找不到該份考卷。請從老師詞庫的考卷紀錄開啟。');
    const selected = ['questions', 'answers'].includes(params.get('part')) ? params.get('part') : 'both';
    byId('backToBook').href = `vocabulary.html?${new URLSearchParams({ book: exam.book.id })}`;
    for (const part of ['both', 'questions', 'answers']) {
        const link = byId(part);
        link.href = `?${new URLSearchParams({ id: exam.id, part })}`;
        if (part === selected) link.setAttribute('aria-current', 'page');
    }
    const title = selected === 'questions' ? '考卷預覽' : selected === 'answers' ? '解答預覽' : '考卷與解答預覽';
    byId('previewHeading').textContent = title;
    byId('examSummary').textContent = `${bookLabel(exam.book)} · 第 ${exam.from}～${exam.to} 課 · ${exam.count} 題 · 種子 ${exam.seed}`;
    document.title = `${exam.book.name} 第 ${exam.from}～${exam.to} 課 ${title.replace('預覽', '')}`;
    // The answer's lesson references can wrap beside longer terms.
    const perPage = exam.questions.some(question => Array.from(question.word).length > 8) ? 12 : 15;
    for (const answer of [false, true]) {
        if ((answer && selected === 'questions') || (!answer && selected === 'answers')) continue;
        for (let offset = 0; offset < exam.questions.length; offset += perPage) {
            byId('examPages').append(renderPage(exam, offset, perPage, answer));
        }
    }
    byId('examControls').hidden = false;
    byId('printExam').addEventListener('click', () => window.print());
} catch (error) {
    byId('previewError').textContent = error.message;
    byId('previewError').setAttribute('data-error', '');
}
