export const CORRECT_FEEDBACKS = [
  "Nice one! 💪 你做到了！",
  "Great effort! 🌟 坚持就是进步！",
  "That's right! 又掌握了一个词！",
  "Well done! 你的练习有成果了 🏆",
  "Awesome! 每次练习都在变强 🚀",
  "Correct! 比昨天又进步了！",
];

export const RETRY_FEEDBACKS = [
  "Almost there! 差一点点，再试一次 🔄",
  "That's a tricky one! 再给它一次机会",
  "Close! 听清读音，再拼一次",
  "没关系，调整一下，再试一次 💡",
];

export const BREAKDOWN_FEEDBACKS = [
  "这个词有个有趣的规律，我们来看看 🧩",
  "没关系！学习就是不断探索，让我帮你分析这个词",
  "This word has a tricky pattern — let's break it down",
  "慢慢来，每个人都有需要多练习几次的单词",
];

export function getRandomFeedback(list: string[]): string {
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
