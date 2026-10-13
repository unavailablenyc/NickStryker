(function () {
  var API = "https://crudcrud.com/api/fb12409ba0be454b9cbd7a837dde2c23/rsvps";
  var STORAGE_KEY = "unavailable-sunset-rsvp";
  var form = document.getElementById("rsvp-form");
  var rows = document.getElementById("guest-rows");
  var addButton = document.getElementById("add-guest");
  var confirmButton = document.getElementById("confirm");
  var error = document.getElementById("form-error");
  var rsvp = document.getElementById("rsvp");
  var confirmed = document.getElementById("confirmed");
  var door = document.getElementById("door");
  var coming = document.getElementById("coming");
  var comingLabel = document.getElementById("coming-label");
  var listNote = document.getElementById("list-note");
  var maps = document.getElementById("maps");
  var editButton = document.getElementById("edit-names");
  var party = null;
  var saving = false;
  var listKey = "";
  var pollId = 0;

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

  function showError(message) {
    error.hidden = false;
    error.textContent = message;
  }

  function clearError() {
    error.hidden = true;
    error.textContent = "";
  }

  function fillDoor() {
    if (door.childNodes.length) return;
    var address = document.createElement("p");
    address.className = "address";
    address.textContent = "456 West 57th Street";
    var entry = document.createElement("p");
    entry.className = "entry";
    entry.textContent = "Dial 401 on the buzzer and come to 4A.";
    door.append(address, entry);
    maps.href = "https://maps.google.com/maps?q=" + encodeURIComponent("456 West 57th Street, New York, NY");
    maps.target = "_blank";
    maps.rel = "noopener noreferrer";
  }

  function namesFor(parties) {
    var found = false;
    var names = [];
    (parties || []).forEach(function (item) {
      var list = item && Array.isArray(item.names) ? item.names : [];
      var mine = party && item && item.partyId === party.partyId;
      if (mine) found = true;
      (mine ? party.names : list).forEach(function (name) {
        if (typeof name === "string" && name.trim()) names.push(name.trim());
      });
    });
    if (party && !found) {
      party.names.forEach(function (name) {
        names.push(name);
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
    var count = names.length === 1 ? "1 person" : names.length + " people";
    comingLabel.textContent = "Who's coming · " + count;
  }

  function showConfirmed(shouldFocus) {
    fillDoor();
    renderComing(party.names);
    rsvp.hidden = true;
    confirmed.hidden = false;
    if (shouldFocus) {
      var title = document.getElementById("confirmed-title");
      if (title) title.focus();
    }
    refreshList();
    if (!pollId) pollId = window.setInterval(refreshList, 20000);
  }

  function showForm(names) {
    if (pollId) {
      window.clearInterval(pollId);
      pollId = 0;
    }
    confirmed.hidden = true;
    rsvp.hidden = false;
    clearError();
    rows.replaceChildren();
    var seed = names && names.length ? names : [""];
    var first;
    seed.forEach(function (name) {
      var input = addRow(name);
      if (!first) first = input;
    });
    if (first) first.focus();
  }

  function remember() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(party));
    } catch (err) {
      /* Confirmation still shows for this view. */
    }
  }

  function savedParty() {
    try {
      var data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!data || !Array.isArray(data.names) || !data.names.length || !data.partyId) return null;
      data.names = data.names.filter(function (name) {
        return typeof name === "string" && name.trim();
      });
      return data.names.length ? data : null;
    } catch (err) {
      return null;
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

  function refreshList() {
    if (document.hidden) return;
    request(API)
      .then(function (response) {
        if (!response.ok) throw new Error("list");
        return response.json();
      })
      .then(function (parties) {
        if (!Array.isArray(parties)) throw new Error("list");
        renderComing(namesFor(parties));
      })
      .catch(function () {
        if (party && !coming.childNodes.length) renderComing(party.names);
      });
  }

  function saveParty(names) {
    var payload = JSON.stringify({ partyId: party.partyId, names: names });
    var url = party.crudId ? API + "/" + party.crudId : API;
    var method = party.crudId ? "PUT" : "POST";
    return request(url, {
      method: method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: payload
    }).then(function (response) {
      if (!response.ok) throw new Error("save");
      if (method === "PUT") return null;
      return response.json();
    });
  }

  function submitNames(names) {
    if (!party) {
      party = {
        partyId: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
      };
    }
    saving = true;
    confirmButton.disabled = true;
    confirmButton.textContent = "Confirming";
    saveParty(names)
      .then(function (created) {
        if (created && created._id) party.crudId = created._id;
        party.names = names;
        listKey = "";
        if (listNote) listNote.hidden = true;
        remember();
        showConfirmed(true);
      })
      .catch(function () {
        party.names = names;
        remember();
        showConfirmed(true);
        if (listNote) listNote.hidden = false;
      })
      .finally(function () {
        saving = false;
        confirmButton.disabled = false;
        confirmButton.textContent = "Confirm";
      });
  }

  addButton.addEventListener("click", function () {
    if (inputs().length >= 12) return;
    addRow("").focus();
  });

  editButton.addEventListener("click", function () {
    var names = party && party.names ? party.names.slice() : [];
    showForm(names);
  });

  rows.addEventListener("input", clearError);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (saving) return;
    clearError();
    var names = readNames();
    if (!names.length) {
      showError("Add at least one name.");
      var first = inputs()[0];
      if (first) first.focus();
      return;
    }
    submitNames(names);
  });

  labelRows();
  party = savedParty();
  if (party) showConfirmed(false);
})();
