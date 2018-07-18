const sentinel = {};

export default function(func) {
  try {
    this.eachDepth(n => {
      if (func(n)) {
        throw sentinel;
      }
    });
  } catch (err) {
    if (err == sentinel) {
      return true;
    } else {
      throw err;
    }
  }
  return false;
}