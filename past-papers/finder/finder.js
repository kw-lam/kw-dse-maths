(function () {
  "use strict";

  var DATA_URL = "data/questions.json";
  var PAGE_SIZE = 9;

  var SUBJECT_LABEL = {
    compulsory: "必修",
    m2: "M2",
  };

  var STATUS_LABEL = {
    pending: "待補連結",
    ready: "有資源",
    out_of_syllabus: "超綱",
  };

  var state = {
    all: [],
    year: "",
    subject: "all",
    paper: "all",
    number: "",
    topic: "all",
    page: 1,
  };

  var el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function uniqueSorted(values, desc) {
    var seen = {};
    var out = [];
    values.forEach(function (v) {
      if (v == null || v === "") return;
      var key = String(v);
      if (!seen[key]) {
        seen[key] = true;
        out.push(v);
      }
    });
    out.sort(function (a, b) {
      if (typeof a === "number" && typeof b === "number") {
        return desc ? b - a : a - b;
      }
      return desc
        ? String(b).localeCompare(String(a), "zh-Hant")
        : String(a).localeCompare(String(b), "zh-Hant");
    });
    return out;
  }

  function newestYear(items) {
    var years = uniqueSorted(
      items.map(function (q) {
        return q.year;
      }),
      true
    );
    return years.length ? String(years[0]) : "";
  }

  function fillSelect(select, values, allLabel, valueOf, labelOf) {
    select.innerHTML = "";
    if (allLabel != null) {
      var optAll = document.createElement("option");
      optAll.value = "all";
      optAll.textContent = allLabel;
      select.appendChild(optAll);
    }
    values.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = valueOf ? valueOf(v) : String(v);
      opt.textContent = labelOf ? labelOf(v) : String(v);
      select.appendChild(opt);
    });
  }

  function populateFilters() {
    var years = uniqueSorted(
      state.all.map(function (q) {
        return q.year;
      }),
      true
    );
    fillSelect(el.year, years, null, function (y) {
      return String(y);
    });

    var papers = uniqueSorted(
      state.all.map(function (q) {
        return String(q.paper);
      }),
      false
    );
    fillSelect(el.paper, papers, "全部", null, function (p) {
      return "Paper " + p;
    });

    var topics = [];
    state.all.forEach(function (q) {
      (q.topics || []).forEach(function (t) {
        topics.push(t);
      });
    });
    topics = uniqueSorted(topics, false);
    fillSelect(el.topic, topics, "全部");

    state.year = newestYear(state.all);
    el.year.value = state.year;
    el.subject.value = state.subject;
    el.paper.value = state.paper;
    el.topic.value = state.topic;
  }

  function normalizeNumber(s) {
    return String(s || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function filtered() {
    var yearNum = parseInt(state.year, 10);
    var numQ = normalizeNumber(state.number);

    return state.all
      .filter(function (q) {
        if (!state.year || q.year !== yearNum) return false;
        if (state.subject !== "all" && q.subject !== state.subject) return false;
        if (state.paper !== "all" && String(q.paper) !== state.paper) return false;
        if (state.topic !== "all") {
          var topics = q.topics || [];
          if (topics.indexOf(state.topic) === -1) return false;
        }
        if (numQ) {
          var qNum = normalizeNumber(q.number);
          if (qNum.indexOf(numQ) === -1 && ("Q" + numQ) !== qNum) {
            // also allow bare digits matching Qn
            if (qNum.replace(/^Q/, "").indexOf(numQ.replace(/^Q/, "")) === -1) {
              return false;
            }
          }
        }
        return true;
      })
      .sort(function (a, b) {
        if (b.year !== a.year) return b.year - a.year;
        if (String(a.paper) !== String(b.paper)) {
          return String(a.paper).localeCompare(String(b.paper), "en");
        }
        var na = parseInt(String(a.number).replace(/\D/g, ""), 10) || 0;
        var nb = parseInt(String(b.number).replace(/\D/g, ""), 10) || 0;
        return na - nb;
      });
  }

  function statusBadge(status) {
    var label = STATUS_LABEL[status] || status;
    var cls = "status-badge " + (status || "pending");
    return '<span class="' + cls + '">' + escapeHtml(label) + "</span>";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function subjectLabel(subject) {
    return SUBJECT_LABEL[subject] || subject;
  }

  function renderCard(q) {
    var topicsHtml = (q.topics || [])
      .map(function (t) {
        return '<span class="topic-chip">' + escapeHtml(t) + "</span>";
      })
      .join("");

    var hasResource = !!(q.resourceUrl && String(q.resourceUrl).trim());
    var hasYt = !!(q.youtubeUrl && String(q.youtubeUrl).trim());

    var resourceBtn = hasResource
      ? '<a class="btn btn-primary" href="' +
        escapeHtml(q.resourceUrl) +
        '" target="_blank" rel="noopener noreferrer">開 Classroom／Drive</a>'
      : '<button type="button" class="btn" disabled aria-disabled="true">待補連結</button>';

    var ytBtn = hasYt
      ? '<a class="btn btn-secondary" href="' +
        escapeHtml(q.youtubeUrl) +
        '" target="_blank" rel="noopener noreferrer">YouTube</a>'
      : "";

    return (
      '<article class="result-card" data-id="' +
      escapeHtml(q.id) +
      '">' +
      '<div class="card-top">' +
      "<div>" +
      '<h3 class="card-title">' +
      escapeHtml(String(q.year)) +
      " · " +
      escapeHtml(subjectLabel(q.subject)) +
      " · Paper " +
      escapeHtml(String(q.paper)) +
      " · " +
      escapeHtml(q.number) +
      "</h3>" +
      '<p class="meta">科目：' +
      escapeHtml(subjectLabel(q.subject)) +
      "　卷別：Paper " +
      escapeHtml(String(q.paper)) +
      "</p>" +
      "</div>" +
      statusBadge(q.status) +
      "</div>" +
      (topicsHtml ? '<div class="topics">' + topicsHtml + "</div>" : "") +
      '<div class="card-actions">' +
      resourceBtn +
      ytBtn +
      "</div>" +
      "</article>"
    );
  }

  function render() {
    var list = filtered();
    var total = list.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    var start = (state.page - 1) * PAGE_SIZE;
    var pageItems = list.slice(start, start + PAGE_SIZE);

    if (!state.year) {
      el.meta.textContent = "請先選擇年份。";
      el.grid.hidden = true;
      el.empty.hidden = false;
      el.empty.innerHTML =
        "<strong>請先選擇年份</strong>為減少一次載入，請先揀年份（預設為最新年份）。";
      el.pagination.hidden = true;
      return;
    }

    el.meta.textContent =
      "顯示 " +
      (total ? start + 1 : 0) +
      "–" +
      (start + pageItems.length) +
      "／共 " +
      total +
      " 題（" +
      state.year +
      " 年）";

    if (total === 0) {
      el.grid.hidden = true;
      el.grid.innerHTML = "";
      el.empty.hidden = false;
      el.empty.innerHTML =
        "<strong>沒有符合條件的題目</strong>試吓改科目、卷別、題號或課題篩選。";
      el.pagination.hidden = true;
      return;
    }

    el.empty.hidden = true;
    el.grid.hidden = false;
    el.grid.innerHTML = pageItems.map(renderCard).join("");

    if (totalPages > 1) {
      el.pagination.hidden = false;
      el.pageInfo.textContent = "第 " + state.page + "／" + totalPages + " 頁";
      el.prev.disabled = state.page <= 1;
      el.next.disabled = state.page >= totalPages;
    } else {
      el.pagination.hidden = true;
    }
  }

  function onFilterChange() {
    state.year = el.year.value;
    state.subject = el.subject.value;
    state.paper = el.paper.value;
    state.topic = el.topic.value;
    state.number = el.number.value;
    state.page = 1;
    render();
  }

  function bind() {
    el.year = $("filter-year");
    el.subject = $("filter-subject");
    el.paper = $("filter-paper");
    el.number = $("filter-number");
    el.topic = $("filter-topic");
    el.grid = $("results-grid");
    el.empty = $("empty-state");
    el.meta = $("results-meta");
    el.pagination = $("pagination");
    el.pageInfo = $("page-info");
    el.prev = $("page-prev");
    el.next = $("page-next");
    el.loading = $("finder-loading");

    ["change"].forEach(function (evt) {
      el.year.addEventListener(evt, onFilterChange);
      el.subject.addEventListener(evt, onFilterChange);
      el.paper.addEventListener(evt, onFilterChange);
      el.topic.addEventListener(evt, onFilterChange);
    });
    el.number.addEventListener("input", onFilterChange);

    el.prev.addEventListener("click", function () {
      if (state.page > 1) {
        state.page -= 1;
        render();
        el.grid.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    el.next.addEventListener("click", function () {
      state.page += 1;
      render();
      el.grid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function showError(msg) {
    if (el.loading) el.loading.hidden = true;
    el.grid.hidden = true;
    el.empty.hidden = false;
    el.empty.innerHTML = "<strong>無法載入資料</strong>" + escapeHtml(msg);
    el.pagination.hidden = true;
    el.meta.textContent = "";
  }

  function init() {
    bind();
    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error("資料格式錯誤");
        state.all = data;
        if (el.loading) el.loading.hidden = true;
        populateFilters();
        render();
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : "未知錯誤");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
