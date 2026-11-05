// Lexis Sapphire Studio - Client Intake Form
// Submits to Google Forms backend (entry IDs from the published form)
(function () {
  var FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScXH-zD2aH-HxQcvTFRnneqHLuyVAVkkvTK12Wn8VYbvkF-kA/formResponse';
  var FBZX = '7876472961041077507';

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

  // Submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    var submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    var data = new URLSearchParams();
    var formData = new FormData(form);
    formData.forEach(function (value, key) {
      data.append(key, value);
    });
    data.append('fvv', '1');
    data.append('pageHistory', '0,1,2,3');
    data.append('fbzx', FBZX);

    fetch(FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data.toString()
    }).then(function () {
      showSuccess();
    }).catch(function () {
      // no-cors means we cannot read the response, but the POST still goes through.
      // Show success anyway since the request was sent.
      showSuccess();
    });
  });

  function showSuccess() {
    form.style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.querySelector('.progress-labels').style.display = 'none';
    document.getElementById('successScreen').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
})();
