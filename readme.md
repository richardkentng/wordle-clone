# [Play Wordle](https://bestwordle.netlify.app/)

![wordle gif](./github-images/wordle-demo-1.gif)

# Description

I built a clone of wordle! I also added some extra features: You can change the length of the word to guess, and you can create a custom Wordle game where YOU choose the word to guess, and then send it to a friend!.

# Technologies, Methods

HTML/CSS, SCSS, Javascript, Local Storage, API

# Resources

- [Free Dicionary API](https://dictionaryapi.dev/) (to check whether words are valid)
- Bootstrap Icons

# Tidbits

- Made custom modals
  - used `z-index` to make sure modals appeared above other content
- Used `touch-action: manipulation;` to prevent zoom-ins when double-clicking on the keyboard

# Challenges

## Limiting Keyboard Input

There are 3 main types of input keys for this game: The Enter key, the Backspace key, and the letter keys. And they need to be disabled during certain times or else unexpected behaivors will occur.

One issue was that opening a modal and entering information into it would simultaneously enter letters into the tiles behind it. People should not accidentally play the game when they are interacting with a modal!

Another issue was that after a valid word was submitted and it's tile colors were being revealed, the enter key could be spammed such that after the color reveal was done, the player would have focus on a row several rows too low instead of on the next row.

## Solution to Limiting Keyboard Input

I declared several boolean variables at the start of the script such as modalActive and tilesColoring. When these variables are true, keyboard input will not go through.

# Clever Code: Two Keyboards, One Function

I wanted this game to be playable by both an on-screen keyboard and with a physical keyboard.

```
function handleKeyboardsInput(event) {
  //The code below determines if this function was called by a physical keyboard or by the on-screen keyboard.
  const input = event.key || event.currentTarget.dataset.value;

  if (input === "Enter") {
    //do something
  } else if (input === "Backspace") {
    //do something
  } else if (isLetter(input)) {
    //do something
  }
}
```

# Fun Code: Encode & Decode Functions

A user can easily create a custom wordle game by clicking on the W/pen icon, submitting a valid word to be guessed by a friend, and then sharing the resulting link. The link contains information about the word to be guessed.

However, the issue is that the game is already over if the friend who receives the link glances at `?word=ANSWER` in the url address. No fun in playing a solved game, is there? To prevent this, I created a fun 'encode' function that essentially converts each letter to its code point value (an integer), which further gets multipled and added by randomly generated integers. Now, the player who receives the link will see something indecipherable by a mere glance: `?word='197l236l251l263l209l248l322'`. Success!

The decode function can that cryptic string and convert it back into an English word, just by reversing the mathematical operations it had undergone. This is in no way a security measure but it is a fun way to convert a word into a cryptic string and then restore it.

```
function encodeWord(str) {
  //eg. converts 'apple' to '268l328l328l312l284l486' (exact output will change)

  const multiblyBy = getRandInt();
  const addBy = getRandInt();

  const numbers = str
    .toUpperCase()
    .split("")
    .map((c) => c.codePointAt() * multiblyBy + addBy);

  numbers.push(`${multiblyBy}${addBy}${getRandInt()}`);
  return numbers.join("l");

  function getRandInt() {
    return Math.floor(Math.random() * 8 + 2); //random integer between 2 and 9
  }
}

function decodeWord(str) {
  //eg. converts '268l328l328l312l284l486' to 'APPLE'

  const encodedNums = str.split("l");

  const key = encodedNums.pop();
  const divideBy = parseInt(key[0]);
  const subtractBy = parseInt(key[1]);

  let customWord = "";
  for (let i = 0; i < encodedNums.length; i++) {
    const encodedNum = parseInt(encodedNums[i]);
    const decodedNum = (encodedNum - subtractBy) / divideBy;
    const letter = String.fromCharCode(decodedNum);
    customWord += letter;
  }
  return customWord;
}
```

# Bugs

## Inaccurate Dictionary API

![invalid word](./github-images/bug-not-a-valid-word.png)

The API lists erroraneously determines some valid words as invalid and some invalid words as valid. A paid API would probably be more accurate, but would have API limits. To address the particular shown in the image error, I added the code below to the top of `function isValidWord()`

```
  //address valid words that the api mistakenly considers invalid
  const words = ["TOUCH"];
  if (words.includes(word)) return true;

```

# Next Steps?

- Use a different, more accurate dictionary API (which checks for valid words)
- provide hints
- update gif
- address unused hidden buttons and metaKey related conditionals, in regards to the custom wordle modal
- make my links more visible
- shorter class names: eg use the class name 'modal-cont' in place of 'modal-white-bg;
- replace error messages with cute animated emojis. eg when an invalid word is entered, show an (animated?) emojo of a blue ghost
- refactor code for modals to avoid repetition
- Fix styling so that keyboard is closer to the grid
- Enable players to create a custom word for a game, and then send the link to their friends!
  - When playing a custom game, show a message: You are guessing someone's wordle!
- Grab answer-words from an API (answers are currently hard coded)
- prevent pressing enter multiple times during tile-reveal animation from losing early before all rows have been entered
- press enter again to speed thru tile-reveal animation
- create a new modal button to show stats
