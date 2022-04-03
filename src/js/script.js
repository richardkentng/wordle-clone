console.log("sanity check");

generateWordGridHTML();
generateOnScreenKeyboard();

let answer = getAnswer();
console.log(answer);
let guess = "";
let ignoreEnterAndBackspace = false;

const rows = document.querySelectorAll(".grid > .row");
let rowIndex = 0; //keep track of the row whose characters are being decided
const keyboard = document.body.querySelector(".keyboard");
let tiles = getTilesOfRow(rowIndex);

const guide = document.body.querySelector(".guide");
const closeGuideBtn = guide.querySelector(".close-btn");
closeGuideBtn.onclick = function () {
  guide.classList.add("hide");
};
document.addEventListener("keyup", handleKeyboardsInput);

//===================================================/
//--------------------- FUNCTIONS -------------------/
//===================================================/

async function onSubmit() {
  if (guess.length < 5) {
    insertToast("Please fill out this row.", rows[rowIndex]);
    return;
  }

  if ((await isValidWord(guess)) === false) {
    insertToast("That's not a valid word.", rows[rowIndex]);
    return;
  }

  //checkpoint: guess is a valid word!

  await colorTilesAndKeys();

  const WIN = guess === answer;

  if (WIN) {
    ignoreEnterAndBackspace = true;
    //on win or lose,
    insertToast("Victory!  Click here to replay!", rows[rowIndex], {
      icon: "😀",
      timeout: false,
      onclick: () => {
        replay({
          won: true,
        });
      },
    });

    //store answer in local storage under 'pastAnswers'
    const pastAnswers = getPastAnswers();
    if (pastAnswers.includes(answer)) return; //past answers must not already contain the answer
    pastAnswers.push(answer);
    localStorage.setItem("pastAnswers", JSON.stringify(pastAnswers));
    return;
  }

  const LOSE = rowIndex + 1 === rows.length; //lose if next row does not exist
  if (LOSE) {
    ignoreEnterAndBackspace = true;
    insertToast("Game Over!  Click here to retry!", rows[rows.length - 1], {
      icon: "😱",
      timeout: false,
      onclick: () => {
        replay({
          won: false,
        });
      },
    });
    return;
  }

  //if game is ongoing:
  guess = ""; //reset guess
  rowIndex++; //'focus' next row
  tiles = getTilesOfRow(rowIndex); //update tiles
}

async function colorTilesAndKeys() {
  //*** store tileEl,keyEl, and their respective color, in 'tile_key_color'
  const tile_key_color = [];
  //^ eg: [div.tile, button.key, "bg-color-green", etc]
  for (let i = 0; i < guess.length; i++) {
    if (!answer.includes(guess[i])) {
      tile_key_color.push([tiles[i], getKeyEl(guess[i]), "bg-color-gray"]);
    }
    //if answer has a DIFFERENT character than guess at index
    else if (answer[i] !== guess[i]) {
      tile_key_color.push([tiles[i], getKeyEl(guess[i]), "bg-color-yellow"]);
    } else {
      //checkpoint:  the character is in answer, at the same index!
      tile_key_color.push([tiles[i], getKeyEl(guess[i]), "bg-color-green"]);
    }
  }

  await colorTiles(tile_key_color);
  colorKeys(tile_key_color);

  //-------------local functions------------
  function colorTiles() {
    return new Promise((resolve) => {
      let tileToColorIndex = 0;
      const colorTilesId = setInterval(() => {
        if (tileToColorIndex > 4) {
          return resolve(clearInterval(colorTilesId));
        }
        const [tileEl, keyEl, colorClass] = tile_key_color[tileToColorIndex];
        tileEl.classList.add(colorClass);
        animateJump(tileEl);
        tileToColorIndex++;
      }, 300);
    });
  }

  function colorKeys() {
    tile_key_color.forEach(([tileEl, keyEl, colorClass]) =>
      keyEl.classList.add(colorClass)
    );
  }

  //----------local functions----------
  function getKeyEl(datasetValue) {
    return keyboard.querySelector(`.key[data-value="${datasetValue}"]`);
  }
}

function handleKeyboardsInput(event) {
  //handle input from physical keyboard and from on-screen keyboard
  const input = event.key || event.currentTarget.dataset.value;

  if (input === "Enter" && !ignoreEnterAndBackspace) {
    onSubmit();
  } else if (
    input === "Backspace" &&
    guess.length &&
    !ignoreEnterAndBackspace
  ) {
    guess = guess.substring(0, guess.length - 1); //remove last character
    clearLastTile();
  } else if (isLetter(input) && guess.length < 5) {
    const char = input.toUpperCase();
    guess += char;
    showCharOnTile(char);
  }
  //----------local functions----------
  function isLetter(char) {
    return char.match(/^[a-zA-Z]$/);
  }
}

function replay({ won }) {
  guess = ""; //reset guess
  rowIndex = 0; //reset row
  tiles = getTilesOfRow(rowIndex); //focus tiles on first row

  clearLettersAndColors();
  ignoreEnterAndBackspace = false;

  if (won) {
    answer = getAnswer(); //choose new word for next game
    console.log("you just won.  word for next game: ", answer);
  }

  //------------local functions------------
  function clearLettersAndColors() {
    const tiles = document.body.querySelectorAll(".tile");
    tiles.forEach((tile) => {
      tile.textContent = "";
      // set class to 'tile' (removes 'bg-color-<color>' class)
      tile.setAttribute("class", "tile");
    });

    const keys = keyboard.querySelectorAll(".key");
    keys.forEach((key) => {
      // set class to 'key' ((removes 'bg-color-<color>' classe(s)))
      key.setAttribute("class", "key");
    });
  }
}

function showCharOnTile(char) {
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].textContent === "") {
      animateJump(tiles[i], "-5px", "0.05s");
      tiles[i].textContent = char;
      break;
    }
  }
}

function clearLastTile() {
  for (let i = tiles.length - 1; i >= 0; i--) {
    if (tiles[i].textContent !== "") {
      tiles[i].textContent = "";
      break;
    }
  }
}

function getTilesOfRow(rowIndex) {
  return rows[rowIndex].querySelectorAll(".tile");
}

async function isValidWord(word) {
  const loadingEl = showCurrentRowLoading();
  const resRaw = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
  );
  const res = await resRaw.json();
  loadingEl.remove();

  if (res.title === "No Definitions Found") return false;
  return true;
}

function showCurrentRowLoading() {
  //create element
  const loading = document.createElement("img");
  loading.setAttribute("src", "./images/loading.gif");
  loading.setAttribute("alt", "loading wheel");
  loading.setAttribute("class", "loading");

  //position loading element to the right of row
  const { right: refRight, top: refTop } =
    rows[rowIndex].getBoundingClientRect();
  loading.style.left = refRight + window.scrollX + 10 + "px"; //10 is for padding
  loading.style.top = refTop + window.scrollY + "px";

  //display
  document.body.appendChild(loading);

  return loading;
}

function getAnswer() {
  //prettier-ignore
  const wordBank = ["SNOUT", "LOWLY", "CYNIC", "STRESS", "SHOOK", "FLEET", "TEETH"];
  //   const wordBank = ["SNOUT", "LOWLY", "CYNIC"];

  const pastAnswers = getPastAnswers();
  if (pastAnswers.length === 0) return getRandom(wordBank);

  const wordBankFiltered = wordBank.filter(
    (word) => !pastAnswers.includes(word)
  );
  if (wordBankFiltered.length === 0) {
    console.warn("All words have been played! Will reuse old words.");
    return getRandom(wordBank);
  }
  return getRandom(wordBankFiltered);

  //----------------local functions----------------
  function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

function getPastAnswers() {
  return JSON.parse(localStorage.getItem("pastAnswers")) || [];
}

function animateJump(element, px = "-10px", sec = "0.1s") {
  element.style.transition = `transform ${sec}`;
  element.addEventListener("transitionend", onTransitionEnd);
  element.style.transform = `translateY(${px})`;
  function onTransitionEnd() {
    element.style.transform = `translateY(0)`;
    element.removeEventListener("transitionend", onTransitionEnd);
  }
}

function insertToast(text, refElement, options = {}) {
  const defaultOptions = {
    icon: "bi-exclamation-square-fill",
    onclick: function () {},
    timeout: 3000,
  };
  //merge defaultOptions and options (when the keys are the same, options has priority)
  options = Object.assign(defaultOptions, options);

  const includesEmoji = (string) => string.match(/\p{Emoji}/u);
  const iconHTML = includesEmoji(options.icon) //decide if options.icon is an emoji or an icon class
    ? `<span class="toast-icon">${options.icon}</span>` //true:     show the emoji
    : `<i class="toast-icon ${options.icon}"></i>`; //false:    show the icon class

  //construct and insert toast:
  const toastStr = `
      <div class="my-toast">
        <i class="arrow-icon bi-caret-up-fill"></i>
        <div class="box">
          ${iconHTML}
          <span class="text">${text}</span>
        </div>
      </div>`;
  document.body.insertAdjacentHTML("beforeend", toastStr);
  const toast = document.body.lastChild;
  //position based on refElement:
  const { x: refX, bottom: refBottom } = refElement.getBoundingClientRect();
  toast.style.left = refX + window.scrollX + "px";
  toast.style.top = refBottom + window.scrollY - 8 + "px"; //subtract 8 to adjust for the whitespace around arrow
  //click to remove
  toast.onclick = function () {
    options.onclick();
    toast.remove();
  };

  if (Number.isInteger(options.timeout)) {
    //   remove toast (after timeout delay)
    setTimeout(() => {
      toast.remove();
    }, options.timeout);
  }
}

function generateWordGridHTML() {
  const grid = document.body.querySelector(".grid");

  for (let i = 0; i < 6; i++) {
    const row = document.createElement("div");
    row.classList.add("row");
    for (let i = 0; i < 5; i++) {
      const tile = document.createElement("div");
      tile.classList.add("tile");
      row.appendChild(tile);
    }
    grid.appendChild(row);
  }
}

function generateOnScreenKeyboard() {
  const keyboard = document.body.querySelector(".keyboard");
  const keyRows = [
    "Q,W,E,R,T,Y,U,I,O,P",
    "A,S,D,F,G,H,J,K,L",
    "Enter,Z,X,C,V,B,N,M,Backspace",
  ];
  keyRows.forEach((keyRow) => {
    const row = document.createElement("div");
    row.classList.add("row");

    const keys = keyRow.split(",");
    keys.forEach((keyValue) => {
      const key = document.createElement("button");
      key.classList.add("key");
      key.textContent = keyValue;
      key.dataset.value = keyValue;
      key.addEventListener("click", handleKeyboardsInput);
      row.appendChild(key);
    });
    keyboard.appendChild(row);
  });
  //replace backspace key's textcontent with backspace icon
  const backspaceKey = keyboard.querySelector("[data-value='Backspace']");
  backspaceKey.innerHTML = `<i class="bi-backspace"></i>`;
  //capitalize enter key's textcontent
  const enterKey = keyboard.querySelector("[data-value='Enter']");
  enterKey.textContent = enterKey.textContent.toUpperCase();
}
