(function () {
  var API = "https://crudcrud.com/api/2236a991e20c4a199aadb0628e127822/rsvps";
  var STORAGE_KEY = "unavailable-sunset-rsvp";
  var ADMIN_KEY = "unavailable-sunset-admin";
  var ADMIN_HASH = "d7e416457e8b57146500df7c17781b03b514a42d7ebd658623b6ebfd104d88d5";
  var form = document.getElementById("rsvp-form");
  var rows = document.getElementById("guest-rows");
  var addButton = document.getElementById("add-guest");
  var confirmButton = document.getElementById("confirm");
  var error = document.getElementById("form-error");
  var phoneInput = document.getElementById("phone");
  var rsvp = document.getElementById("rsvp");
  var confirmed = document.getElementById("confirmed");
  var coming = document.getElementById("coming");
  var comingLabel = document.getElementById("coming-label");
  var listNote = document.getElementById("list-note");
  var editButton = document.getElementById("edit-names");
  var signinForm = document.getElementById("signin-form");
  var signinPhone = document.getElementById("signin-phone");
  var signinError = document.getElementById("signin-error");
  var adminOpen = document.getElementById("admin-open");
  var adminForm = document.getElementById("admin-form");
  var adminPassword = document.getElementById("admin-password");
  var adminError = document.getElementById("admin-error");
  var adminPanel = document.getElementById("admin-panel");
  var adminCount = document.getElementById("admin-count");
  var adminList = document.getElementById("admin-list");
  var adminOut = document.getElementById("admin-out");
  var adminGate = document.getElementById("admin-gate");
  var party = null;
  var saving = false;
  var listKey = "";
  var view = "form";

  if (!form || !rows) return;

  function inputs() {
    return Array.prototype.slice.call(rows.querySelectorAll(".guest-name"));
  }

  function readNames() {
    return inputs()
      .map(function (input) {
        return input.value.trim().replace(/\s+/g, " ");
      })
      .filter(Boolean)
      .slice(0, 12);
  }

  function digits(value) {
    var d = String(value || "").replace(/\D/g, "");
    if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
    return d;
  }

  function validPhone(value) {
    return digits(value).length === 10;
  }

  function formatPhone(value) {
    var d = digits(value);
    if (d.length !== 10) return value || "";
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }

  function firstName(name) {
    var clean = String(name || "").trim().replace(/\s+/g, " ");
    if (!clean) return "";
    return clean.split(" ")[0];
  }

  function peopleCount(names) {
    return names.length === 1 ? "1 person" : names.length + " people";
  }

  function labelRows() {
    var fields = inputs();
    fields.forEach(function (input, index) {
      var number = index + 1;
      var label = input.parentNode;
      var row = label.parentNode;
      var remove = row.querySelector(".remove");
      var text = label.childNodes[0];
      if (text) text.nodeValue = "Guest " + number + " ";
      if (fields.length === 1) {
        if (remove) remove.remove();
        return;
      }
      if (!remove) {
        remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-line remove";
        remove.addEventListener("click", function () {
          row.remove();
          labelRows();
          var first = inputs()[0];
          if (first) first.focus();
        });
        row.appendChild(remove);
      }
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove guest " + number);
    });
  }

  function addRow(value) {
    var row = document.createElement("div");
    row.className = "name-row";
    var label = document.createElement("label");
    label.appendChild(document.createTextNode("Guest "));
    var input = document.createElement("input");
    input.className = "guest-name";
    input.type = "text";
    input.maxLength = 80;
    input.autocomplete = "name";
    if (value) input.value = value;
    label.appendChild(input);
    row.appendChild(label);
    rows.appendChild(row);
    labelRows();
    return input;
  }

  function showError(node, message) {
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || "";
  }

  function partyNames(item) {
    var list = item && Array.isArray(item.names) ? item.names : [];
    return list.filter(function (name) {
      return typeof name === "string" && name.trim();
    }).map(function (name) {
      return name.trim().replace(/\s+/g, " ");
    });
  }

  function firstNamesFrom(parties) {
    var found = false;
    var names = [];
    (parties || []).forEach(function (item) {
      var list = partyNames(item);
      var mine = party && item && (item.partyId === party.partyId || item._id === party.crudId);
      if (mine) found = true;
      (mine ? party.names : list).forEach(function (name) {
        var first = firstName(name);
        if (first) names.push(first);
      });
    });
    if (party && !found) {
      party.names.forEach(function (name) {
        var first = firstName(name);
        if (first) names.push(first);
      });
    }
    return names;
  }

  function renderComing(names) {
    var key = names.join("\n");
    if (key === listKey && coming.childNodes.length) return;
    listKey = key;
    coming.replaceChildren();
    names.forEach(function (name) {
      var item = document.createElement("li");
      item.textContent = name;
      coming.appendChild(item);
    });
    comingLabel.textContent = "Who's coming · " + peopleCount(names);
  }

  function renderAdmin(parties) {
    var people = [];
    adminList.replaceChildren();
    (parties || []).forEach(function (item) {
      var list = partyNames(item);
      if (!list.length) return;
      people = people.concat(list);
      var row = document.createElement("li");
      var who = document.createElement("span");
      who.className = "who";
      who.textContent = list.join(", ");
      var num = document.createElement("span");
      num.className = "num";
      num.textContent = validPhone(item.phone) ? formatPhone(item.phone) : "No phone yet";
      row.append(who, num);
      adminList.appendChild(row);
    });
    adminCount.textContent = peopleCount(people);
  }

  function showForm(names, phone) {
    view = "form";
    confirmed.hidden = true;
    adminPanel.hidden = true;
    rsvp.hidden = false;
    if (adminGate) adminGate.hidden = false;
    showError(error, "");
    rows.replaceChildren();
    var seed = names && names.length ? names : [""];
    var first;
    seed.forEach(function (name) {
      var input = addRow(name);
      if (!first) first = input;
    });
    if (phoneInput) phoneInput.value = phone ? formatPhone(phone) : "";
    if (first) first.focus();
  }

  function showConfirmed(shouldFocus) {
    view = "guest";
    listKey = "";
    rsvp.hidden = true;
    adminPanel.hidden = true;
    confirmed.hidden = false;
    if (adminGate) adminGate.hidden = false;
    if (shouldFocus) {
      var title = document.getElementById("confirmed-title");
      if (title) title.focus();
    }
    refreshList();
  }

  function showAdmin(shouldFocus) {
    view = "admin";
    rsvp.hidden = true;
    confirmed.hidden = true;
    adminPanel.hidden = false;
    if (adminGate) adminGate.hidden = true;
    if (shouldFocus) {
      var title = document.getElementById("admin-title");
      if (title) title.focus();
    }
    refreshList();
  }

  function remember() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(party));
    } catch (err) {
      /* This browser can still show the confirmation. */
    }
  }

  function rememberAdmin(on) {
    try {
      if (on) sessionStorage.setItem(ADMIN_KEY, "1");
      else sessionStorage.removeItem(ADMIN_KEY);
    } catch (err) {
      /* The admin view still opens for this page view. */
    }
  }

  function savedParty() {
    try {
      var data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!data || !Array.isArray(data.names) || !data.names.length || !data.partyId) return null;
      if (!validPhone(data.phone)) return null;
      data.names = data.names.filter(function (name) {
        return typeof name === "string" && name.trim();
      });
      data.phone = digits(data.phone);
      return data.names.length ? data : null;
    } catch (err) {
      return null;
    }
  }

  function adminSaved() {
    try {
      return sessionStorage.getItem(ADMIN_KEY) === "1";
    } catch (err) {
      return false;
    }
  }

  function request(url, options) {
    var controller = new AbortController();
    var timer = window.setTimeout(function () {
      controller.abort();
    }, 12000);
    options = options || {};
    options.signal = controller.signal;
    options.cache = "no-store";
    return fetch(url, options).finally(function () {
      window.clearTimeout(timer);
    });
  }

  function loadParties() {
    return request(API).then(function (response) {
      if (!response.ok) throw new Error("list");
      return response.json();
    }).then(function (parties) {
      if (!Array.isArray(parties)) throw new Error("list");
      return parties;
    });
  }

  function refreshList() {
    if (document.hidden || view === "form") return;
    loadParties().then(function (parties) {
      if (view === "admin") renderAdmin(parties);
      else renderComing(firstNamesFrom(parties));
      if (listNote) listNote.hidden = true;
    }).catch(function () {
      if (view === "guest" && party && !coming.childNodes.length) renderComing(firstNamesFrom([]));
      if (listNote && view === "guest") listNote.hidden = false;
    });
  }

  function saveParty(names, phone) {
    var payload = JSON.stringify({ partyId: party.partyId, names: names, phone: phone });
    var url = party.crudId ? API + "/" + party.crudId : API;
    var method = party.crudId ? "PUT" : "POST";
    return request(url, {
      method: method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: payload
    }).then(function (response) {
      if (!response.ok) throw new Error("save");
      if (method === "PUT") return { created: false };
      return response.json().then(function (created) {
        return { created: true, id: created && created._id };
      });
    });
  }

  function notifyHost(names, phone) {
    var message = names.join(", ") + " signed up for sunset massage. Text them at " + formatPhone(phone) + ".";
    return fetch("https://formsubmit.co/ajax/nickstryker@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: "Sunset massage RSVP",
        message: message,
        _subject: "Sunset massage RSVP",
        _captcha: "false",
        _template: "box"
      })
    }).catch(function () {
      return null;
    });
  }

  function submitNames(names, phone) {
    var creating = !party || !party.crudId;
    if (!party) {
      party = {
        partyId: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
      };
    }
    saving = true;
    confirmButton.disabled = true;
    confirmButton.textContent = "Confirming";
    saveParty(names, phone).then(function (result) {
      if (result && result.id) party.crudId = result.id;
      party.names = names;
      party.phone = phone;
      remember();
      if (result && result.created) notifyHost(names, phone);
      showConfirmed(true);
    }).catch(function () {
      if (creating) party = null;
      showError(error, "Couldn't save that. Try again in a moment.");
    }).finally(function () {
      saving = false;
      confirmButton.disabled = false;
      confirmButton.textContent = "Confirm";
    });
  }

  function sha256(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
    });
  }

  function matchParty(parties, phone) {
    for (var i = 0; i < parties.length; i += 1) {
      if (digits(parties[i].phone) === phone) {
        return {
          partyId: parties[i].partyId || parties[i]._id,
          crudId: parties[i]._id,
          names: partyNames(parties[i]),
          phone: phone
        };
      }
    }
    return null;
  }

  addButton.addEventListener("click", function () {
    if (inputs().length >= 12) return;
    addRow("").focus();
  });

  editButton.addEventListener("click", function () {
    var names = party && party.names ? party.names.slice() : [];
    showForm(names, party && party.phone);
  });

  rows.addEventListener("input", function () {
    showError(error, "");
  });
  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      showError(error, "");
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (saving) return;
    showError(error, "");
    var names = readNames();
    var phone = digits(phoneInput && phoneInput.value);
    if (!names.length) {
      showError(error, "Add at least one name.");
      var first = inputs()[0];
      if (first) first.focus();
      return;
    }
    if (!validPhone(phone)) {
      showError(error, "Add a phone number.");
      if (phoneInput) phoneInput.focus();
      return;
    }
    submitNames(names, phone);
  });

  signinForm.addEventListener("submit", function (event) {
    event.preventDefault();
    showError(signinError, "");
    var phone = digits(signinPhone.value);
    if (!validPhone(phone)) {
      showError(signinError, "Enter the phone number you RSVP'd with.");
      signinPhone.focus();
      return;
    }
    loadParties().then(function (parties) {
      var found = matchParty(parties, phone);
      if (!found) {
        showError(signinError, "That number isn't confirmed yet.");
        return;
      }
      party = found;
      remember();
      showConfirmed(true);
    }).catch(function () {
      showError(signinError, "The list didn't load. Try again in a moment.");
    });
  });

  adminOpen.addEventListener("click", function () {
    adminForm.hidden = !adminForm.hidden;
    showError(adminError, "");
    if (!adminForm.hidden && adminPassword) adminPassword.focus();
  });

  adminForm.addEventListener("submit", function (event) {
    event.preventDefault();
    showError(adminError, "");
    sha256(adminPassword.value).then(function (hash) {
      if (hash !== ADMIN_HASH) {
        showError(adminError, "That password doesn't match.");
        return;
      }
      rememberAdmin(true);
      adminPassword.value = "";
      showAdmin(true);
    }).catch(function () {
      showError(adminError, "Sign-in didn't open. Try again.");
    });
  });

  adminOut.addEventListener("click", function () {
    rememberAdmin(false);
    party = savedParty();
    if (party) showConfirmed(false);
    else showForm();
  });

  var refreshGuests = document.getElementById("refresh-guests");
  var refreshAdmin = document.getElementById("refresh-admin");
  if (refreshGuests) refreshGuests.addEventListener("click", refreshList);
  if (refreshAdmin) refreshAdmin.addEventListener("click", refreshList);

  labelRows();
  if (adminSaved()) showAdmin(false);
  else {
    party = savedParty();
    if (party) showConfirmed(false);
  }
})();
