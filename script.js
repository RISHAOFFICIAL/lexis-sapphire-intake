// Lexis Sapphire Studio - Client Intake Form
// Submits to Google Forms backend (entry IDs from the published form)
(function () {
  var FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScXH-zD2aH-HxQcvTFRnneqHLuyVAVkkvTK12Wn8VYbvkF-kA/formResponse';
  // NOTE: No hardcoded fbzx token. Google rotates it on every page load and
  // the formResponse endpoint accepts submissions without one.

  var form = document.getElementById('intakeForm');
  var steps = document.querySelectorAll('.form-step');
  var progressFill = document.getElementById('progressFill');
  var progressSteps = document.querySelectorAll('.progress-step');
  var currentStep = 1;
  var totalSteps = 4;

  function showStep(n) {
    steps.forEach(function (s) {
      s.classList.toggle('active', parseInt(s.dataset.step, 10) === n);
    });
    progressSteps.forEach(function (p) {
      p.classList.toggle('active', parseInt(p.dataset.step, 10) <= n);
    });
    progressFill.style.width = (n / totalSteps * 100) + '%';
    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep(n) {
    var valid = true;
    if (n === 1) {
      var name = document.getElementById('name');
      var business = document.getElementById('business');
      var email = document.getElementById('email');
      valid = checkField(name, name.value.trim() !== '') && valid;
      valid = checkField(business, business.value.trim() !== '') && valid;
      valid = checkField(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) && valid;
    }
    if (n === 2) {
      var checked = form.querySelectorAll('input[name="entry.1297644646"]:checked');
      var errEl = document.getElementById('servicesError');
      if (checked.length === 0) {
        errEl.style.display = 'block';
        valid = false;
      } else {
        errEl.style.display = 'none';
      }
    }
    return valid;
  }

  function checkField(input, isValid) {
    var field = input.closest('.field');
    field.classList.toggle('invalid', !isValid);
    return isValid;
  }

  // Clear invalid state on input
  form.querySelectorAll('input, textarea').forEach(function (el) {
    el.addEventListener('input', function () {
      var field = el.closest('.field');
      if (field) field.classList.remove('invalid');
    });
  });

  // Next / Back buttons
  form.querySelectorAll('[data-next]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = parseInt(btn.dataset.next, 10);
      if (validateStep(currentStep)) showStep(next);
    });
  });
  form.querySelectorAll('[data-prev]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showStep(parseInt(btn.dataset.prev, 10));
    });
  });

  // Social media follow-up section: show when Social Media is selected
  var socialCheckbox = form.querySelector('input[name="entry.1297644646"][value="Social media management"]');
  var socialDetails = document.getElementById('socialDetails');
  var handlesField = document.getElementById('handlesField');

  function toggleSocial() {
    socialDetails.hidden = !socialCheckbox.checked;
  }
  socialCheckbox.addEventListener('change', toggleSocial);
  toggleSocial();

  // Show handles field only when they say they have accounts
  form.querySelectorAll('input[name="sm_has_accounts"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var checked = form.querySelector('input[name="sm_has_accounts"]:checked');
      handlesField.hidden = !checked || (checked.value !== 'Yes' && checked.value !== 'Yes, but I want more accounts');
    });
  });

  function checkedValues(name) {
    var out = [];
    form.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (el) {
      out.push(el.value);
    });
    return out;
  }

  function checkedValue(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  // Compile social media answers into a text block for the Google Form
  // (appended to the "Anything Else" field so it lands in the response sheet)
  function socialSummary() {
    if (!socialCheckbox.checked) return '';
    var lines = ['Social Media Details:'];
    var platforms = checkedValues('sm_platforms');
    if (platforms.length) lines.push('Platforms: ' + platforms.join(', '));
    var content = checkedValues('sm_content');
    if (content.length) lines.push('Content needed: ' + content.join(', '));
    var freq = checkedValue('sm_frequency');
    if (freq) lines.push('Posts per week: ' + freq);
    var hasAccts = checkedValue('sm_has_accounts');
    if (hasAccts) {
      var handles = document.getElementById('smHandles').value.trim();
      lines.push('Existing accounts: ' + hasAccts + (handles ? ' (' + handles + ')' : ''));
    }
    var goal = checkedValue('sm_goal');
    if (goal) lines.push('Main goal: ' + goal);
    var assets = checkedValue('sm_assets');
    if (assets) lines.push('Brand assets: ' + assets);
    if (lines.length === 1) return '';
    return lines.join('\n');
  }

  // Submit via a NATIVE form POST into a hidden iframe, the same mechanism
  // Google's own form uses. Scripted fetch() POSTs to formResponse are
  // unreliable (Google silently drops the answers or rejects them), while
  // a real browser form navigation is what the endpoint is built for.
  // The iframe's load event means Google answered the submission.
  var responseFrame = document.createElement('iframe');
  responseFrame.name = 'gformResponse';
  responseFrame.style.display = 'none';
  document.body.appendChild(responseFrame);

  var submitPending = false;
  var submitTimeoutId = null;

  responseFrame.addEventListener('load', function () {
    if (!submitPending) return; // ignore the initial about:blank load
    clearTimeout(submitTimeoutId);
    submitPending = false;
    showSuccess();
  });

  // Submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    var submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    // Fold the social media answers into the Anything Else field
    var summary = socialSummary();
    if (summary) {
      var anythingElse = document.getElementById('anythingElse');
      anythingElse.value = anythingElse.value.trim()
        ? anythingElse.value.trim() + '\n\n' + summary
        : summary;
    }

    // Google's own form stamps the submit time; do the same.
    document.getElementById('submissionTimestamp').value = String(Date.now());

    // If Google never answers (network failure), show the error screen
    // instead of leaving the client hanging or faking a success.
    submitPending = true;
    submitTimeoutId = setTimeout(function () {
      if (submitPending) {
        submitPending = false;
        showError();
      }
    }, 25000);

    form.action = FORM_URL;
    form.method = 'POST';
    form.target = 'gformResponse';
    form.submit();
  });

  function showSuccess() {
    form.style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.querySelector('.progress-labels').style.display = 'none';
    document.getElementById('successScreen').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showError() {
    var submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send My Project Details';
    form.style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.querySelector('.progress-labels').style.display = 'none';
    document.getElementById('errorScreen').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // "Try Again" on the error screen: bring the form back with answers intact
  document.getElementById('retryBtn').addEventListener('click', function () {
    document.getElementById('errorScreen').hidden = true;
    document.querySelector('.progress-bar').style.display = '';
    document.querySelector('.progress-labels').style.display = '';
    form.style.display = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
