document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.dropdown').forEach(function(dropdown){
    var btn = dropdown.querySelector('.dropdown-btn');
    if(!btn) return;
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var wasOpen = dropdown.classList.contains('open');
      document.querySelectorAll('.dropdown.open').forEach(function(d){ d.classList.remove('open'); });
      if (!wasOpen) dropdown.classList.add('open');
    });
  });
  document.addEventListener('click', function(){
    document.querySelectorAll('.dropdown.open').forEach(function(d){ d.classList.remove('open'); });
  });
});
