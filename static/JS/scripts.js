const query = (obj) =>
  Object.keys(obj)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]))
    .join("&");
const colorThemes = document.querySelectorAll('[name="theme"]');
const markdown = window.markdownit();
const message_box = document.getElementById(`messages`);
const message_input = document.getElementById(`message-input`);
const box_conversations = document.querySelector(`.top`);
const spinner = box_conversations.querySelector(".spinner");
const stop_generating = document.querySelector(`.stop_generating`);
const send_button = document.querySelector(`#send-button`);
let prompt_lock = false;

hljs.addPlugin(new CopyButtonPlugin());

function resizeTextarea(textarea) {
  textarea.style.height = '80px';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

const format = (text) => {
  return text.replace(/(?:\r\n|\r|\n)/g, "<br>");
};

message_input.addEventListener("blur", () => {
  window.scrollTo(0, 0);
});

message_input.addEventListener("focus", () => {
  document.documentElement.scrollTop = document.documentElement.scrollHeight;
});

const delete_conversations = async () => {
  localStorage.clear();
  await new_conversation();
};

const handle_ask = async () => {
  message_input.style.height = `80px`;
  message_input.focus();

  window.scrollTo(0, 0);
  let message = message_input.value;

  if (message.length > 0) {
    message_input.value = ``;
    await ask_gpt(message);
  }
};

const remove_cancel_button = async () => {
  stop_generating.classList.add(`stop_generating-hiding`);

  setTimeout(() => {
    stop_generating.classList.remove(`stop_generating-hiding`);
    stop_generating.classList.add(`stop_generating-hidden`);
  }, 300);
};

const ask_gpt = async (message) => {
  try {
    message_input.value = ``;
    message_input.innerHTML = ``;
    message_input.innerText = ``;

    add_conversation(window.cconversation_history, message.substr(0, 20));
    window.scrollTo(0, 0);
    window.controller = new AbortController();

    const jailbreak = document.getElementById("jailbreak");
    const model = document.getElementById("model");
    prompt_lock = true;
    window.text = ``;
    window.token = message_id();

    stop_generating.classList.remove(`stop_generating-hidden`);

    message_box.innerHTML += `
      <div class="message">
        <div class="user">
          ${user_image}
          <i class="fa-regular fa-phone-arrow-up-right"></i>
        </div>
        <div class="content" id="user_${window.token}"> 
          ${format(message)}
        </div>
      </div>
    `;

    message_box.scrollTop = message_box.scrollHeight;
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 500));
    window.scrollTo(0, 0);

    message_box.innerHTML += `
      <div class="message">
        <div class="user">
          ${gpt_image} <i class="fa-regular fa-phone-arrow-down-left"></i>
        </div>
        <div class="content" id="gpt_${window.token}">
          <div id="cursor"></div>
        </div>
      </div>
    `;

    message_box.scrollTop = message_box.scrollHeight;
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 1000));
    window.scrollTo(0, 0);

    const response = await fetch("/chat", {
      method: "POST",
      signal: window.controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        message: message,
        model: model.options[model.selectedIndex].value,
        jailbreak: jailbreak.options[jailbreak.selectedIndex].value,
      }),
    });

    const result = await response.json();

    const text = result.response;

    document.getElementById(`gpt_${window.token}`).innerHTML = markdown.render(text);
    document.querySelectorAll(`code`).forEach((el) => {
      hljs.highlightElement(el);
    });

    window.scrollTo(0, 0);
    message_box.scrollTo({ top: message_box.scrollHeight, behavior: "auto" });

    add_message(window.cconversation_history, "user", message);
    add_message(window.cconversation_history, "assistant", text);

    message_box.scrollTop = message_box.scrollHeight;
    await remove_cancel_button();
    prompt_lock = false;

    await load_conversations(20, 0);
    window.scrollTo(0, 0);
  } catch (e) {
    add_message(window.cconversation_history, "user", message);
  
    message_box.scrollTop = message_box.scrollHeight;
    await remove_cancel_button();
    prompt_lock = false;
  
    await load_conversations(20, 0);
  
    console.error(e);
  
    let cursorDiv = document.getElementById(`cursor`);
    if (cursorDiv) cursorDiv.parentNode.removeChild(cursorDiv);
  
    if (e.name !== `AbortError`) {
      let error_message = `Oops! Something went wrong. Please try again or reload the page.`;
  
      // Log the detailed error information to the console
      console.error("Error details:", e);
  
      document.getElementById(`gpt_${window.token}`).innerHTML = error_message;
      add_message(window.cconversation_history, "assistant", error_message);
    } else {
      document.getElementById(`gpt_${window.token}`).innerHTML += ` [Aborted]`;
      add_message(window.cconversation_history, "assistant", text + ` [Aborted]`);
    }
  
    window.scrollTo(0, 0);
  }
};

const clear_conversations = async () => {
  const elements = box_conversations.childNodes;
  let index = elements.length;

  if (index > 0) {
    while (index--) {
      const element = elements[index];
      if (
        element.nodeType === Node.ELEMENT_NODE &&
        element.tagName.toLowerCase() !== `button`
      ) {
        box_conversations.removeChild(element);
      }
    }
  }
};

const clear_conversation = async () => {
  let messages = message_box.getElementsByTagName(`div`);

  while (messages.length > 0) {
    message_box.removeChild(messages[0]);
  }
};

const show_option = async (cconversation_history) => {
  const conv = document.getElementById(`conv-${cconversation_history}`);
  const yes = document.getElementById(`yes-${cconversation_history}`);
  const not = document.getElementById(`not-${cconversation_history}`);

  conv.style.display = "none";
  yes.style.display = "block";
  not.style.display = "block"; 
}

const hide_option = async (cconversation_history) => {
  const conv = document.getElementById(`conv-${cconversation_history}`);
  const yes = document.getElementById(`yes-${cconversation_history}`);
  const not = document.getElementById(`not-${cconversation_history}`);

  conv.style.display = "block";
  yes.style.display = "none";
  not.style.display = "none"; 
}

const delete_conversation = async (cconversation_history) => {
  localStorage.removeItem(`conversation:${cconversation_history}`);

  const conversation = document.getElementById(`convo-${cconversation_history}`);
    conversation.remove();

  if (window.cconversation_history == cconversation_history) {
    await new_conversation();
  }

  await load_conversations(20, 0, true);
};

const set_conversation = async (cconversation_history) => {
  history.pushState({}, null, `/chat/${cconversation_history}`);
  window.cconversation_history = cconversation_history;

  await clear_conversation();
  await load_conversation(cconversation_history);
  await load_conversations(20, 0, true);
};

const new_conversation = async () => {
  history.pushState({}, null, `/chat/`);
  window.cconversation_history = uuid();

  await clear_conversation();
  await load_conversations(20, 0, true);
};

const load_conversation = async (cconversation_history) => {
  let conversation = await JSON.parse(
    localStorage.getItem(`conversation:${cconversation_history}`)
  );
  console.log(conversation, cconversation_history);

  for (item of conversation.items) {
    message_box.innerHTML += `
            <div class="message">
                <div class="user">
                    ${item.role == "assistant" ? gpt_image : user_image}
                    ${
                      item.role == "assistant"
                        ? `<i class="fa-regular fa-phone-arrow-down-left"></i>`
                        : `<i class="fa-regular fa-phone-arrow-up-right"></i>`
                    }
                </div>
                <div class="content">
                    ${
                      item.role == "assistant"
                        ? markdown.render(item.content)
                        : item.content
                    }
                </div>
            </div>
        `;
  }

  document.querySelectorAll(`code`).forEach((el) => {
    hljs.highlightElement(el);
  });

  message_box.scrollTo({ top: message_box.scrollHeight, behavior: "smooth" });

  setTimeout(() => {
    message_box.scrollTop = message_box.scrollHeight;
  }, 500);
};

const get_conversation = async (cconversation_history) => {
  let conversation = await JSON.parse(
    localStorage.getItem(`conversation:${cconversation_history}`)
  );
  return conversation.items;
};

const add_conversation = async (cconversation_history, title) => {
  if (localStorage.getItem(`conversation:${cconversation_history}`) == null) {
    localStorage.setItem(
      `conversation:${cconversation_history}`,
      JSON.stringify({
        id: cconversation_history,
        title: title,
        items: [],
      })
    );
  }
};

const add_message = async (cconversation_history, role, content) => {
  before_adding = JSON.parse(
    localStorage.getItem(`conversation:${cconversation_history}`)
  );

  before_adding.items.push({
    role: role,
    content: content,
  });

  localStorage.setItem(
    `conversation:${cconversation_history}`,
    JSON.stringify(before_adding)
  ); // update conversation
};

const load_conversations = async (limit, offset, loader) => {
  //console.log(loader);
  //if (loader === undefined) box_conversations.appendChild(spinner);

  let conversations = [];
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i).startsWith("conversation:")) {
      let conversation = localStorage.getItem(localStorage.key(i));
      conversations.push(JSON.parse(conversation));
    }
  }

  //if (loader === undefined) spinner.parentNode.removeChild(spinner)
  await clear_conversations();

  for (conversation of conversations) {
    box_conversations.innerHTML += `
    <div class="convo" id="convo-${conversation.id}">
      <div class="left" onclick="set_conversation('${conversation.id}')">
          <i class="fa-regular fa-comments"></i>
          <span class="convo-title">${conversation.title}</span>
      </div>
      <i onclick="show_option('${conversation.id}')" class="fa-regular fa-trash" id="conv-${conversation.id}"></i>
      <i onclick="delete_conversation('${conversation.id}')" class="fa-regular fa-check" id="yes-${conversation.id}" style="display:none;"></i>
      <i onclick="hide_option('${conversation.id}')" class="fa-regular fa-x" id="not-${conversation.id}" style="display:none;"></i>
    </div>
    `;
  }

  document.querySelectorAll(`code`).forEach((el) => {
    hljs.highlightElement(el);
  });
};

document.getElementById(`cancelButton`).addEventListener(`click`, async () => {
  window.controller.abort();
  console.log(`aborted ${window.cconversation_history}`);
});

function h2a(str1) {
  var hex = str1.toString();
  var str = "";

  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }

  return str;
}

const uuid = () => {
  return `xxxxxxxx-xxxx-4xxx-yxxx-${Date.now().toString(16)}`.replace(
    /[xy]/g,
    function (c) {
      var r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );
};

const message_id = () => {
  random_bytes = (Math.floor(Math.random() * 1338377565) + 2956589730).toString(
    2
  );
  unix = Math.floor(Date.now() / 1000).toString(2);

  return BigInt(`0b${unix}${random_bytes}`).toString();
};

window.onload = async () => {
  load_settings_localstorage();

  conversations = 0;
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i).startsWith("conversation:")) {
      conversations += 1;
    }
  }

  if (conversations == 0) localStorage.clear();

  await setTimeout(() => {
    load_conversations(20, 0);
  }, 1);

  if (!window.location.href.endsWith(`#`)) {
    if (/\/chat\/.+/.test(window.location.href)) {
      await load_conversation(window.cconversation_history);
    }
  }

message_input.addEventListener(`keydown`, async (evt) => {
    if (prompt_lock) return;
    if (evt.keyCode === 13 && !evt.shiftKey) {
        evt.preventDefault();
        console.log('pressed enter');
        await handle_ask();
    } else {
      message_input.style.removeProperty("height");
      message_input.style.height = message_input.scrollHeight + 4 + "px";
    }
  });

  send_button.addEventListener(`click`, async () => {
    console.log("clicked send");
    if (prompt_lock) return;
    await handle_ask();
  });

  register_settings_localstorage();
};

document.querySelector(".mobile-sidebar").addEventListener("click", (event) => {
  const sidebar = document.querySelector(".conversations");

  if (sidebar.classList.contains("shown")) {
    sidebar.classList.remove("shown");
    event.target.classList.remove("rotated");
  } else {
    sidebar.classList.add("shown");
    event.target.classList.add("rotated");
  }

  window.scrollTo(0, 0);
});

const register_settings_localstorage = async () => {
  settings_ids = ["switch", "model", "jailbreak"];
  settings_elements = settings_ids.map((id) => document.getElementById(id));
  settings_elements.map((element) =>
    element.addEventListener(`change`, async (event) => {
      switch (event.target.type) {
        case "checkbox":
          localStorage.setItem(event.target.id, event.target.checked);
          break;
        case "select-one":
          localStorage.setItem(event.target.id, event.target.selectedIndex);
          break;
        default:
          console.warn("Unresolved element type");
      }
    })
  );
};

const load_settings_localstorage = async () => {
  settings_ids = ["switch", "model", "jailbreak"];
  settings_elements = settings_ids.map((id) => document.getElementById(id));
  settings_elements.map((element) => {
    if (localStorage.getItem(element.id)) {
      switch (element.type) {
        case "checkbox":
          element.checked = localStorage.getItem(element.id) === "true";
          break;
        case "select-one":
          element.selectedIndex = parseInt(localStorage.getItem(element.id));
          break;
        default:
          console.warn("Unresolved element type");
      }
    }
  });
};

// Theme storage for recurring viewers
const storeTheme = function (theme) {
  localStorage.setItem("theme", theme);
};

// set theme when visitor returns
const setTheme = function () {
  const activeTheme = localStorage.getItem("theme");
  colorThemes.forEach((themeOption) => {
    if (themeOption.id === activeTheme) {
      themeOption.checked = true;
    }
  });
  // fallback for no :has() support
  document.documentElement.className = activeTheme;
};

colorThemes.forEach((themeOption) => {
  themeOption.addEventListener("click", () => {
    storeTheme(themeOption.id);
    // fallback for no :has() support
    document.documentElement.className = themeOption.id;
  });
});

document.onload = setTheme();

function observeNewMessages() {
  var targetNode = document.getElementById('chatbox');
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'childList') {
        var addedNodes = mutation.addedNodes;
        addedNodes.forEach(function (node) {
          if (node.classList.contains('message')) {
            var label = node.querySelector(".message-text-label");
            if (label) {
              label.style.display = "inline";
              hideLogoContainer();
            }
          }
        });
      }
    });
  })};