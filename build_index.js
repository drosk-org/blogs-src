const fs = require("fs");
const matter = require("gray-matter");
const POSTS_DIR = "posts";
const BODY_READ_LIMIT = 2048; 

function estimateReadTime(summary, body) {
  const combined = `${summary}\n${body}`;
  const words = combined.split(/\s+/).length;
  const minutes = words / 200;
  const seconds = Math.round(minutes * 60);
  let human;
  if (seconds < 60) {
    human = `${seconds} seconds`;
  } else if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    human = `${m} minute${m === 1 ? "" : "s"}`;
  } else {
    const h = (seconds / 3600).toFixed(1);
    human = `${h} hours`;
  }
  return { seconds, human };
}

function main() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".md"));
  const posts = files.map(filename => {
    const fullPath = `${POSTS_DIR}/${filename}`;
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(raw);
    const data = parsed.data;
    const body = parsed.content.slice(0, BODY_READ_LIMIT);
    const { seconds, human } = estimateReadTime(data.summary || "", body);
    return {
      slug: filename.replace(".md", ""),
      post_title: data.post_title || "",
      date: data.date || null,
      tags: data.tags || [],
      summary: data.summary || "",
      read_time_seconds: seconds,
      read_time_human: human
    };
  });
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  fs.writeFileSync("index.json", JSON.stringify(posts, null, 2));
}

main();
