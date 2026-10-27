/* KGX's Dev Library website. Copyright (c) KGX PRODUCTIONS 2026. All rights reserved. */
(function(){
  'use strict';
  var root=document.documentElement;
  function $(id){return document.getElementById(id);}

  // Light / dark.
  var themeButton=$('theme-toggle');
  var systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
  function isDark(){return root.dataset.theme?root.dataset.theme==='dark':systemTheme.matches;}
  function syncTheme(){var dark=isDark();root.classList.toggle('theme-is-dark',dark);if(themeButton){themeButton.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');themeButton.title=dark?'Switch to light theme':'Switch to dark theme';}var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=dark?'#111820':'#f2f4f7';}
  syncTheme();
  if(themeButton)themeButton.addEventListener('click',function(){var theme=isDark()?'light':'dark';root.dataset.theme=theme;try{localStorage.setItem('kgx-theme',theme);}catch(e){}syncTheme();});
  if(systemTheme.addEventListener)systemTheme.addEventListener('change',syncTheme);

  // Phone menu.
  var menuButton=$('menu-toggle'),menu=$('site-menu');
  if(menuButton&&menu){
    function setMenu(open){menu.classList.toggle('is-open',open);menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close the menu':'Open the menu');}
    menuButton.addEventListener('click',function(){setMenu(!menu.classList.contains('is-open'));});
    menu.addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')setMenu(false);});
    document.addEventListener('click',function(e){if(!e.target.closest('#site-menu')&&!e.target.closest('#menu-toggle'))setMenu(false);});
  }

  // Roadmap: filters and search.
  var releases=Array.prototype.slice.call(document.querySelectorAll('.release'));
  var releaseSearch=$('release-search');
  if(releases.length&&releaseSearch){
    var filters=Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
    var active='all';
    var updateReleases=function(){var term=releaseSearch.value.trim().toLocaleLowerCase();var count=0;releases.forEach(function(r){var show=(active==='all'||r.dataset.status===active||r.dataset.group===active)&&r.textContent.toLocaleLowerCase().indexOf(term)!==-1;r.hidden=!show;if(show)count++;});filters.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.filter===active));});$('release-count').textContent=String(count).padStart(2,'0')+' RELEASE'+(count===1?'':'S');$('no-results').hidden=count!==0;$('result-announcement').textContent=count+' release'+(count===1?'':'s')+' shown';};
    filters.forEach(function(b){b.addEventListener('click',function(){active=b.dataset.filter;updateReleases();});});
    releaseSearch.addEventListener('input',updateReleases);
    $('reset-filters').addEventListener('click',function(){active='all';releaseSearch.value='';updateReleases();releaseSearch.focus();});
    var revealRelease=function(){var h=window.location.hash;if(!/^#release-[0-9]+$/.test(h))return;var t=$(h.slice(1));if(t&&t.hidden){active='all';releaseSearch.value='';updateReleases();}if(t)requestAnimationFrame(function(){t.scrollIntoView({block:'start'});});};
    window.addEventListener('hashchange',revealRelease);
    revealRelease();
  }

  // Release history: search, expand all, links to one build.
  var builds=Array.prototype.slice.call(document.querySelectorAll('.build'));
  var historySearch=$('history-search');
  if(builds.length&&historySearch){
    var series=Array.prototype.slice.call(document.querySelectorAll('[data-series]'));
    var toggle=$('history-toggle');var expanded=false;
    var updateHistory=function(){var term=historySearch.value.trim().toLocaleLowerCase();var count=0;builds.forEach(function(b){var show=!term||b.textContent.toLocaleLowerCase().indexOf(term)!==-1;b.hidden=!show;if(show)count++;b.open=term?show:expanded;});series.forEach(function(g){g.hidden=!g.querySelector('.build:not([hidden])');});$('history-count').textContent=String(count).padStart(2,'0')+' BUILD'+(count===1?'':'S');$('history-empty').hidden=count!==0;$('history-announcement').textContent=count+' build'+(count===1?'':'s')+' shown';};
    historySearch.addEventListener('input',updateHistory);
    toggle.addEventListener('click',function(){expanded=!expanded;historySearch.value='';updateHistory();toggle.textContent=expanded?'Collapse all':'Expand all';toggle.setAttribute('aria-pressed',String(expanded));});
    $('history-reset').addEventListener('click',function(){historySearch.value='';updateHistory();historySearch.focus();});
    var openBuild=function(){var h=window.location.hash;if(!/^#build-[0-9-]+$/.test(h))return;var t=$(h.slice(1));if(!t)return;if(t.hidden){historySearch.value='';updateHistory();}t.open=true;requestAnimationFrame(function(){t.scrollIntoView({block:'start'});});};
    window.addEventListener('hashchange',openBuild);
    openBuild();
  }

  // Help: search boxes over a list of tutorials.
  Array.prototype.forEach.call(document.querySelectorAll('[data-search]'),function(input){
    var view=input.closest('[data-view]');
    var results=view.querySelector('[data-results]');
    var rows=Array.prototype.slice.call((results||view).querySelectorAll('.tool-row'));
    var groups=Array.prototype.slice.call(view.querySelectorAll('[data-group]'));
    var hideWhen=Array.prototype.slice.call(view.querySelectorAll('[data-hide-when-searching]'));
    var count=view.querySelector('[data-count]');
    var empty=view.querySelector('[data-empty]');
    var noun=count.textContent.replace(/^[0-9]+ /,'');
    input.addEventListener('input',function(){
      var term=input.value.trim().toLocaleLowerCase();var n=0;
      rows.forEach(function(r){var s=!term||r.textContent.toLocaleLowerCase().indexOf(term)!==-1;r.hidden=!s;if(s)n++;});
      groups.forEach(function(g){g.hidden=!g.querySelector('.tool-row:not([hidden])');});
      if(results){results.hidden=!term;hideWhen.forEach(function(el){el.hidden=!!term;});}
      count.textContent=n+' '+noun;
      empty.hidden=n!==0;
    });
  });

  // A tutorial's "On this page" list marks the part being read.
  var toc=document.querySelector('.help-toc');
  if(toc&&'IntersectionObserver' in window){
    var links=Array.prototype.slice.call(toc.querySelectorAll('a'));
    var heads=links.map(function(a){return $(a.getAttribute('href').slice(1));}).filter(Boolean);
    var obs=new IntersectionObserver(function(entries){entries.forEach(function(en){if(en.isIntersecting){links.forEach(function(a){a.classList.toggle('is-here',a.getAttribute('href')==='#'+en.target.id);});}});},{rootMargin:'-120px 0px -70% 0px'});
    heads.forEach(function(h){obs.observe(h);});
  }

  // Visit counts (GoatCounter): this month in the footer, the last 12 months on the home page.
  (function(){
    var meta=document.querySelector('meta[name="kgx-stats"]');
    if(!meta||!window.fetch)return;
    var base=meta.content.replace(/\/$/,'');
    var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function pad(n){return(n<10?'0':'')+n;}
    function ymd(d){return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());}
    function num(n){return n.toLocaleString('en-US');}
    // One count, kept for an hour in this browser (GoatCounter updates every few hours anyway).
    var inflight={};
    function count(query){
      if(!inflight[query])inflight[query]=countNow(query);
      return inflight[query];
    }
    function countNow(query){
      var key='kgx-visits:'+query, now=Date.now();
      try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&now-c.t<3600000)return Promise.resolve(c.n);}catch(e){}
      return fetch(base+'/counter/TOTAL.json'+query).then(function(r){
        if(r.status===404)return 0; // (no views in that range)
        if(!r.ok)throw new Error(r.status);
        return r.json().then(function(j){return parseInt(String(j.count||'0').replace(/[^0-9]/g,''),10)||0;});
      }).then(function(n){try{localStorage.setItem(key,JSON.stringify({t:now,n:n}));}catch(e){}return n;});
    }
    function month(offset){
      // (calendar months in UTC, as GoatCounter keeps them by default)
      var t=new Date(),a=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()-offset,1)),b=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()-offset+1,0));
      return {label:MONTHS[a.getUTCMonth()]+' '+a.getUTCFullYear(),short:MONTHS[a.getUTCMonth()],q:'?start='+ymd(a)+'&end='+ymd(b)};
    }
    var foot=$('footer-visits');
    var thisMonth=month(0);
    count(thisMonth.q).then(function(n){if(foot){foot.textContent=num(n)+' page views this month';foot.hidden=false;}}).catch(function(){});
    var box=$('visits');
    if(!box)return;
    var list=[];for(var i=11;i>=0;i--)list.push(month(i));
    Promise.all(list.map(function(m){return count(m.q).catch(function(){return null;});})).then(function(counts){
      if(counts.every(function(c){return c===null;}))return;
      var max=Math.max.apply(null,counts.map(function(c){return c||0;}).concat([1]));
      var bars=$('visits-bars');
      bars.innerHTML='';
      list.forEach(function(m,i){
        var c=counts[i]||0,li=document.createElement('li');
        li.className='visits-bar'+(i===list.length-1?' is-now':'');
        li.title=m.label+': '+num(c)+' views';
        var fill=document.createElement('span');fill.className='visits-fill';fill.style.height=Math.max(2,Math.round(c/max*100))+'%';
        var val=document.createElement('span');val.className='visits-value mono';val.textContent=c>=1000?(Math.round(c/100)/10)+'k':String(c);
        var lab=document.createElement('span');lab.className='visits-month mono';lab.textContent=m.short;
        li.appendChild(val);li.appendChild(fill);li.appendChild(lab);bars.appendChild(li);
      });
      $('visits-now').textContent=num(counts[11]||0);
      $('visits-last').textContent=num(counts[10]||0);
      box.hidden=false;
      count('').then(function(n){$('visits-all').textContent=num(n);}).catch(function(){$('visits-all').textContent='-';});
    });
  })();

  // Site search (header button, or "/"): every tutorial section, FAQ answer and release.
  (function(){
    var dlg=$('site-search'),open=$('search-open');
    if(!dlg||!open)return;
    // (no <dialog> in this browser: the button goes to the toolbox Help, which has its own search)
    if(typeof dlg.showModal!=='function'){open.addEventListener('click',function(){window.location.href='https://kgx96.github.io/garrysmod-kgxs-admin-toolbox/help.html';});return;}
    var input=$('site-search-input'),list=$('site-search-results'),hint=$('site-search-hint'),root=dlg.getAttribute('data-root')||'';
    var index=null,loading=null;
    function load(){
      if(index)return Promise.resolve(index);
      if(!loading)loading=fetch(root+'search.json').then(function(r){return r.json();}).then(function(d){index=d.map(function(e){e.l=(e.t+' '+e.c+' '+e.x).toLowerCase();e.tl=e.t.toLowerCase();return e;});return index;});
      return loading;
    }
    function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
    // Highlights every word at once on the plain text, then escapes each piece.
    function mark(t,words){
      var ws=words.filter(function(w){return w.length>=2;}).map(function(w){return w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');});
      if(!ws.length)return esc(t);
      var re=new RegExp('('+ws.join('|')+')','ig');
      return String(t).split(re).map(function(part,i){return i%2?'<mark>'+esc(part)+'</mark>':esc(part);}).join('');
    }
    function snippet(x,words){var lx=x.toLowerCase(),at=-1;words.some(function(w){at=lx.indexOf(w);return at>=0;});var a=Math.max(0,at-50);return(a>0?'...':'')+x.slice(a,a+170)+(x.length>a+170?'...':'');}
    function search(){
      var q=input.value.trim().toLowerCase();
      list.innerHTML='';
      if(!q){hint.textContent='Type to search every project, roadmap and toolbox tutorial.';return Promise.resolve();}
      return load().then(function(d){
        if(input.value.trim().toLowerCase()!==q)return;
        var words=q.split(/\s+/).filter(Boolean);
        var hits=d.filter(function(e){return words.every(function(w){return e.l.indexOf(w)>=0;});});
        hits.forEach(function(e){e.s=words.reduce(function(n,w){return n+(e.tl.indexOf(w)>=0?10:0);},0)+(e.u.indexOf('#')<0?3:0)+(/Releases$/.test(e.c)?-2:0);});
        hits.sort(function(a,b){return b.s-a.s;});
        hint.textContent=hits.length?(hits.length>40?'40 of '+hits.length+' results':hits.length+' result'+(hits.length===1?'':'s')):'Nothing found. Try another word.';
        hits.slice(0,40).forEach(function(e){
          var li=document.createElement('li');
          li.innerHTML='<a href="'+esc((/^https?:/.test(e.u)?'':root)+e.u)+'"><small class="mono">'+esc(e.c)+'</small><strong>'+mark(e.t,words)+'</strong><span>'+mark(snippet(e.x,words),words)+'</span></a>';
          list.appendChild(li);
        });
      }).catch(function(){hint.textContent='The search could not load. Try again in a moment.';});
    }
    var timer;
    input.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(search,120);});
    // Enter: the first result of what is typed now (not of a search still waiting to run).
    input.addEventListener('keydown',function(e){
      if(e.key!=='Enter')return;
      e.preventDefault();
      clearTimeout(timer);
      search().then(function(){var a=list.querySelector('a');if(a){dlg.close();window.location.href=a.href;}});
    });
    function show(){dlg.showModal();input.focus();input.select();load().catch(function(){});}
    open.addEventListener('click',show);
    $('site-search-close').addEventListener('click',function(){dlg.close();});
    dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close();});
    list.addEventListener('click',function(e){if(e.target.closest('a'))dlg.close();});
    document.addEventListener('keydown',function(e){
      var t=e.target,typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);
      if(e.key==='/'&&!typing&&!dlg.open&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();show();}
    });
  })();

  // "Copy link" on tutorial sections and FAQ answers.
  (function(){
    // (FAQ: in the answer, not in the question: <summary> is a button already)
    var heads=document.querySelectorAll('.help-article h4[id], .faq-item[id] .faq-answer');
    Array.prototype.forEach.call(heads,function(h){
      var id=h.id||h.closest('[id]').id;
      var b=document.createElement('button');
      b.type='button';b.className='copy-link';b.setAttribute('aria-label','Copy a link to this part');b.title='Copy a link to this part';
      b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
      b.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();
        var url=window.location.href.split('#')[0]+'#'+id;
        function done(){b.classList.add('is-copied');b.title='Copied';setTimeout(function(){b.classList.remove('is-copied');b.title='Copy a link to this part';},1500);}
        if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,function(){window.location.hash=id;});
        else window.location.hash=id;
      });
      h.appendChild(b);
    });
    // A link to a FAQ answer opens it (also when already on the page).
    function openFaq(){var h=window.location.hash;if(h&&/^#faq-/.test(h)){var d=document.getElementById(h.slice(1));if(d&&d.tagName==='DETAILS'){d.open=true;d.scrollIntoView();}}}
    openFaq();
    window.addEventListener('hashchange',openFaq);
  })();
})();
