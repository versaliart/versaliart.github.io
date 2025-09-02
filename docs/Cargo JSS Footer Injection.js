<!-- External JS (root path) -->
<script defer src="https://versaliart.github.io/Cargo%20JSS%20Starfield.js"></script>

<!-- Ensure activation markers exist (helps inside the editor shell) -->
<script>
document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('has-starfield');    // if your CSS keys off this
  if (!document.getElementById('starfield-enable')) {
    const m = document.createElement('div');
    m.id = 'starfield-enable';
    m.style.display = 'none';
    document.body.prepend(m);
  }
});
</script>
