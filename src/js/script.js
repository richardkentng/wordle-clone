console.log("sanity check");

const rows = generateWordGridHTML();
const keyboard = generateOnScreenKeyboard();
let rowIndex = 0; //the row whose characters are being decided
let tiles = getTilesOfRow(rowIndex);
addEventListenersToModals(); //listens for clicks/change on .guide-cont modal & .settings-cont modal  //uses tiles.length^
let answer = getAnswer(); //decides length of answer based on tiles.length
let guess = "";
// console.log(answer);
let gameJustEnded = false; //determine enable/disable of enter & backspace, whether changing word-length should refresh page

document.addEventListener("keyup", handleKeyboardsInput);

//===================================================/
//--------------------- FUNCTIONS -------------------/
//===================================================/

async function onSubmit() {
  if (guess.length < tiles.length) {
    insertToast("Please fill out this row.", rows[rowIndex]);
    return;
  }

  if ((await isValidWord(guess)) === false) {
    insertToast("That's not a valid word.", rows[rowIndex]);
    return;
  }

  //checkpoint: a valid word was entered!

  await colorTilesAndKeys();

  const WIN = guess === answer;

  if (WIN) {
    gameJustEnded = true;
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
    gameJustEnded = true;
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
        if (tileToColorIndex > tiles.length - 1) {
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

  if (input === "Enter" && !gameJustEnded) {
    onSubmit();
  } else if (input === "Backspace" && guess.length && !gameJustEnded) {
    guess = guess.substring(0, guess.length - 1); //remove last character
    clearLastTile();
  } else if (isLetter(input) && guess.length < tiles.length) {
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
  gameJustEnded = false;

  if (won) {
    answer = getAnswer(); //choose new word for next game
    // console.log("you just won.  word for next game: ", answer);
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
  const wordsSpaced =
    "i a in me if my up ab we go ad you eat car egg odd her wall jaw bad mix shy sun old fix far kid hot bye why spy lie fall fee fine rich gold milk live boss core luck lawn cute done love date face goal hard rain mine real last quiz race head hope hurt earn good fire jump tick lick cold wine seek gaze fear same gray bold fame fist grow grip hair mood team lead cool sour leaf dear moon joke warm slim dark fork yard back fail wild leap flow ring grit feel away stir once time snack drive stale value robot label light tree purse money scare sorry relax alien tired enjoy touch trial first argue sound sight speak logic peace group large yearn cough croak ghost tease clock blink heart frame brave child stare watch spark stoop bleed brain strive strong truth chance final limit alone clear stand fight sweat sweet extra magic laugh stone juice wrong wrath scent crank smile snake horse panic baby branch breeze forest marvel loyal bloom should spirit finger signal strict hungry desire honest wonder never secret wealth pretty compete compare regret appear wither impulse sudden moment second polish prefer vanish filter perfume perfect gender sneeze model anger party fierce actual admit danger gather seduce purpose precious special unique pursue science research restart wallet inspire stumble emotion almost severe scatter ancient mistake fortune fashion increase grateful appreciate whisper alcohol nervous muscle shiver jealous deceive extreme balance obstacle identity stranger mystery handsome temporary butterfly language different waterfall interview individual momentum beautiful justice advantage position";

  let words = wordsSpaced.toUpperCase().split(/ +/); //all words
  words = words.filter((word) => word.length === tiles.length); //words of a certain length

  const pastAnswers = getPastAnswers();

  const unseenWords = words.filter((word) => !pastAnswers.includes(word)); //get words that haven't already been played

  if (unseenWords.length === 0) {
    console.warn(
      `All words of length ${length} have been played! Will reuse old words.`
    );
    return getRandom(words);
  }

  return getRandom(unseenWords);

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
  //get number of columns to generate based on url paramater 'length'. Default to 5 columns.
  const params = new URLSearchParams(window.location.search);
  const urlLength = parseInt(params.get("length"));
  const numColumns = isIntegerBetween(urlLength, 1, 10) ? urlLength : 5;

  const grid = document.body.querySelector(".grid");
  //create rows
  for (let i = 0; i < 6; i++) {
    const row = document.createElement("div");
    row.classList.add("row");
    //create columns (length of word)
    for (let i = 0; i < numColumns; i++) {
      const tile = document.createElement("div");
      tile.classList.add("tile");
      row.appendChild(tile);
    }
    grid.appendChild(row);
  }

  //if grid width exceeds width of window, then decrease tile size
  if (grid.getBoundingClientRect().width > window.innerWidth) {
    const tileSize = window.innerWidth / numColumns;
    const allTiles = grid.querySelectorAll(".tile");
    allTiles.forEach((tile) => {
      tile.style.margin = 0;
      tile.style.width = tileSize + "px";
      tile.style.height = tileSize + "px";
    });
  }

  return grid.querySelectorAll(".row");
  //-------------local functions-----
  function isIntegerBetween(x, startNum, endNum) {
    return Number.isInteger(x) && x >= startNum && x <= endNum;
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
  return keyboard;
}

function addEventListenersToModals() {
  //-----------------GUIDE MODAL
  //click 'i' to see guide:
  const infoIcon = document.body.querySelector(".info-icon");
  infoIcon.onclick = () => {
    unhide(guideCont);
  };

  //click 'x' or 'okay' button to close guide:
  const guideCont = document.body.querySelector(".guide-cont");
  guideCont.querySelector(".okay-btn").onclick = () => {
    hide(guideCont);
    localStorage.setItem("sawGuide", "1");
  };

  guideCont.querySelector(".modal-x-btn").onclick = () => {
    hide(guideCont);
  };

  //update text to reflect word length
  guideCont.querySelector(".word-length").textContent = tiles.length;

  //if guide has not been seen, then show guide
  if (!localStorage.getItem("sawGuide")) unhide(guideCont);

  //-----------------SETTINGS MODAL
  const gearIcon = document.body.querySelector(".gear-icon");
  const settingsCont = document.body.querySelector(".settings-cont");
  const lengthSelect = settingsCont.querySelector(".select-word-length");
  lengthSelect.value = tiles.length; //update select element to reflect current word-to-guess length
  const refreshWarning = settingsCont.querySelector(".refresh-warning");

  //click gear-icon to show settings modal
  gearIcon.onclick = () => {
    hide(refreshWarning);
    unhide(settingsCont);
  };

  //click 'x' or .no-btn or white-bg to hide settings modal
  settingsCont.onclick = (e) => {};
  const closeSettingsTriggers = [
    settingsCont,
    settingsCont.querySelector(".modal-x-btn"),
    settingsCont.querySelector(".refresh-warning .no-btn"),
  ];
  closeSettingsTriggers.forEach((ele) => {
    ele.onclick = function (e) {
      if (ele === settingsCont && e.target !== e.currentTarget) return; //disallow clicks on the modal to close modal
      hide(settingsCont);
      lengthSelect.value = tiles.length;
    };
  });

  //click .yes-btn in the refresh warning to reload page with new word length
  refreshWarning.querySelector(".yes-btn").onclick = function () {
    refresh_updateLength();
  };

  //listen for 'change' event on .select-word-length
  lengthSelect.addEventListener("change", onChange_lengthSelect);

  function onChange_lengthSelect(e) {
    const gameInProgress = rowIndex > 0 && !gameJustEnded;
    if (gameInProgress) {
      unhide(refreshWarning);
      return;
    }
    refresh_updateLength();
  }

  function refresh_updateLength() {
    window.location.search = `?length=${lengthSelect.value}`;
  }

  //position settings modal in the middle of the grid
  settingsCont.querySelector(".settings").style.top =
    gearIcon.getBoundingClientRect().bottom + 180 + window.scrollY + "px";

  //------------local-functions--------------
  function unhide(element) {
    element.classList.remove("hide");
  }
  function hide(element) {
    element.classList.add("hide");
  }
}
