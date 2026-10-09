export function waitForReady(child, marker, label) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => finish(new Error(`${label} startup timed out.`)), 120_000);
    const inspect = data => {
      process.stdout.write(data);
      output = (output + data).slice(-4096);
      if (output.includes(marker)) finish();
    };
    const exited = () => finish(new Error(`${label} stopped before it was ready.`));
    function finish(error) {
      clearTimeout(timeout);
      child.stdout.off('data', inspect); child.stderr.off('data', inspect);
      child.off('exit', exited);
      child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
      if (error) reject(error); else resolve();
    }
    child.stdout.on('data', inspect); child.stderr.on('data', inspect);
    child.once('exit', exited);
  });
}
