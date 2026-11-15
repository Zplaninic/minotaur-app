// Reads a password without echoing it. When stdin is not a terminal (for
// example `printf 'secret' | pnpm ...`), the whole of stdin is the password.
const readHidden = (question: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = "";
    const finish = (error?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          finish();
          return;
        }
        if (char === "\u0003") {
          finish(new Error("Cancelled"));
          return;
        }
        value = char === "\u007f" || char === "\b" ? value.slice(0, -1) : value + char;
      }
    };
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    stdin.on("data", onData);
  });

const readPiped = async (): Promise<string> => {
  let value = "";
  for await (const chunk of process.stdin) {
    value += String(chunk);
  }
  return value.replace(/\r?\n$/, "");
};

export const readNewPassword = async (): Promise<string> => {
  if (!process.stdin.isTTY) {
    return readPiped();
  }
  const password = await readHidden("Password: ");
  const repeated = await readHidden("Repeat password: ");
  if (password !== repeated) {
    throw new Error("The passwords do not match");
  }
  return password;
};
