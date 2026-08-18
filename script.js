(function(){
  var header=document.querySelector('[data-header]');
  var menuButton=document.querySelector('.menu-toggle');
  var navigation=document.getElementById('primary-navigation');
  var reveals=document.querySelectorAll('.reveal');
  var reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function updateHeader(){
    if(header)header.classList.toggle('is-scrolled',window.scrollY>24);
  }

  function closeMenu(){
    if(!menuButton||!navigation)return;
    menuButton.setAttribute('aria-expanded','false');
    menuButton.setAttribute('aria-label','Open menu');
    navigation.classList.remove('is-open');
    header.classList.remove('menu-active');
    document.body.classList.remove('menu-open');
  }

  if(header){
    updateHeader();
    window.addEventListener('scroll',updateHeader,{passive:true});
  }

  if(menuButton&&navigation){
    menuButton.addEventListener('click',function(){
      var opening=menuButton.getAttribute('aria-expanded')!=='true';
      menuButton.setAttribute('aria-expanded',String(opening));
      menuButton.setAttribute('aria-label',opening?'Close menu':'Open menu');
      navigation.classList.toggle('is-open',opening);
      header.classList.toggle('menu-active',opening);
      document.body.classList.toggle('menu-open',opening);
    });
    navigation.querySelectorAll('a').forEach(function(link){link.addEventListener('click',closeMenu);});
    document.addEventListener('keydown',function(event){if(event.key==='Escape')closeMenu();});
    window.addEventListener('resize',function(){if(window.innerWidth>1120)closeMenu();});
  }

  if(reduceMotion||!('IntersectionObserver' in window)){
    reveals.forEach(function(element){element.classList.add('in');});
  }else{
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.1,rootMargin:'0px 0px -30px'});
    reveals.forEach(function(element){observer.observe(element);});
  }

  document.querySelectorAll('.faq-list details').forEach(function(item){
    item.addEventListener('toggle',function(){
      if(!item.open)return;
      document.querySelectorAll('.faq-list details[open]').forEach(function(openItem){
        if(openItem!==item)openItem.open=false;
      });
    });
  });

  document.querySelectorAll('[data-year]').forEach(function(element){
    element.textContent=String(new Date().getFullYear());
  });

  function formFields(form){
    var fields={};
    new FormData(form).forEach(function(value,key){
      if(Object.prototype.hasOwnProperty.call(fields,key)){
        if(!Array.isArray(fields[key]))fields[key]=[fields[key]];
        fields[key].push(value);
      }else{
        fields[key]=value;
      }
    });
    return fields;
  }

  document.querySelectorAll('.brevo-form').forEach(function(form){
    form.addEventListener('submit',async function(event){
      event.preventDefault();
      if(!form.reportValidity())return;

      var button=form.querySelector('button[type="submit"]');
      var status=form.querySelector('.form-status');
      var originalLabel=button.textContent;
      form.setAttribute('aria-busy','true');
      button.disabled=true;
      button.textContent='Sending…';
      status.textContent='';
      status.className=status.className.replace(/\s+is-(success|error)/g,'');

      try{
        var response=await fetch(form.action,{
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body:JSON.stringify({formType:form.dataset.brevoForm,fields:formFields(form)})
        });
        var result=await response.json().catch(function(){return {};});
        if(!response.ok)throw new Error(result.message||'Submission failed');
        form.reset();
        status.textContent=form.dataset.successMessage||result.message||'Thank you. Your information was sent.';
        status.classList.add('is-success');
      }catch(error){
        status.textContent=error.message||'We could not send your information. Please try again.';
        status.classList.add('is-error');
      }finally{
        form.removeAttribute('aria-busy');
        button.disabled=false;
        button.textContent=originalLabel;
      }
    });
  });
})();
