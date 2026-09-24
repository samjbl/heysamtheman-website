/* home.js — the home page's own script. Was inline at the foot of
   index.html until 24 Sep 2026; moved out so it can carry `defer` (an inline
   script cannot). Deferred scripts run in document order after parsing, so
   metrics.js (also deferred, declared first) has set window.SAM_METRICS by
   the time this runs. Loaded from index.html only. */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── .rise: reveal once, on first sight ─────────────────────────────
     Replaces the scroll-driven animation (see the CSS note). Each element
     gets is-in the first time it is on screen and is then unobserved. */
  var risers=[].slice.call(document.querySelectorAll('.rise'));
  if(risers.length){
    if(reduce||!('IntersectionObserver' in window)){
      risers.forEach(function(el){ el.classList.add('is-in'); });
    } else {
      var riseIO=new IntersectionObserver(function(es){
        es.forEach(function(e){
          if(!e.isIntersecting) return;
          e.target.classList.add('is-in');
          riseIO.unobserve(e.target);
        });
      },{rootMargin:'0px 0px -8% 0px',threshold:.06});
      risers.forEach(function(el){ riseIO.observe(el); });
    }
  }

  /* nav folds once you leave the top */
  /* The bar tints and blurs once you leave the top. Read the offset
     explicitly rather than leaning on the bare `scrollY` global, and listen
     for resize and load too so the state is right after a lazy image
     changes the page height. */
  var navBar=document.getElementById('nav');
  var progressBar=document.querySelector('.progress');
  var onScroll=function(){
    var y=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0;
    navBar.classList.toggle('is-stuck',y>24);
    /* reading-progress bar: a transform only, so it stays on the compositor */
    if(progressBar){
      var max=document.documentElement.scrollHeight-window.innerHeight;
      progressBar.style.transform='scaleX('+(max>0?Math.min(y/max,1):0)+')';
    }
  };
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll,{passive:true});
  addEventListener('load',onScroll);
  onScroll();

  var btn=document.getElementById('menuBtn'), menu=document.getElementById('menu');
  var mIcon=document.getElementById('menuIcon'), mLabel=document.getElementById('menuLabel');
  var setMenu=function(open){
    menu.dataset.open=String(open);
    btn.setAttribute('aria-expanded',String(open));
    mLabel.textContent=open?'Close':'Menu';
    mIcon.firstElementChild.setAttribute('href',open?'#i-close':'#i-menu');
    document.body.style.overflow=open?'hidden':'';
  };
  btn.addEventListener('click',function(){setMenu(menu.dataset.open!=='true')});
  /* ── contact form ─────────────────────────────────────────────────
     Set ONE of the two below and the form goes live.

     FORM_ENDPOINT  — a Google Apps Script web app running under Sam's
                      own Google account. The script is in
                      contact-form.gs next to this file; deploy steps
                      are in its header. Nothing to sign up for, mail
                      lands in the existing Gmail.
     WEB3FORMS_KEY  — fallback if the Apps Script route is a hassle.

     Until one is set the submit button stays disabled and the form
     shows the address instead, so no enquiry is silently swallowed.
     ──────────────────────────────────────────────────────────────── */
  /* Verified 20 Sep 2026: this /exec answers {"success":true,"status":"alive"}.
     If you ever redeploy, the URL changes — paste the new one here. */
  var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyg1KNwhjJYOzPNLHFn7In53MZbf5BzbJ8dHvGUq1TkTM-mv4ZUZjFtK_DvsSp3Kpz6aw/exec';
  var WEB3FORMS_KEY = '';   // <-- or a Web3Forms access key

  /* Stamped at page load and sent with the form. The backend drops
     anything that comes back in under 3 seconds — a person cannot
     type a name, an email and a message that fast, a script can. */
  var FORM_LOADED = Date.now();

  var form=document.getElementById('contactForm');
  var status=document.getElementById('formStatus');
  var submitBtn=form.querySelector('button[type="submit"]');
  var note=form.querySelector('.form__note');
  var el=function(id){return document.getElementById(id)};
  var v=function(id){return (el(id).value||'').trim()};
  var live=!!(FORM_ENDPOINT||WEB3FORMS_KEY);

  if(!live){
    submitBtn.setAttribute('disabled','');
    note.innerHTML='The form is not connected yet — email '
      +'<a href="mailto:hey@heysamtheman.com">hey@heysamtheman.com</a> in the meantime.';
  }

  /* Apps Script rejects a JSON content-type preflight, so send the body
     as text/plain — it still arrives as a JSON string server side. */
  function deliver(payload){
    if(FORM_ENDPOINT){
      return fetch(FORM_ENDPOINT,{
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify(payload)
      }).then(function(r){return r.json()});
    }
    payload.access_key=WEB3FORMS_KEY;
    payload.subject='Website enquiry'+(payload.company?' · '+payload.company:'')+' · '+payload.name;
    return fetch('https://api.web3forms.com/submit',{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload)
    }).then(function(r){return r.json()});
  }

  /* clear a field's error the moment it is being corrected */
  ['f-name','f-email','f-msg'].forEach(function(id){
    el(id).addEventListener('input',function(){
      this.closest('.field').classList.remove('is-error');
      this.removeAttribute('aria-invalid');
    });
  });

  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!live) return;
    if(el('f-company-url').value) return;   /* honeypot: bots fill hidden fields */

    var name=v('f-name'), email=v('f-email'), brand=v('f-brand'), msg=v('f-msg');

    var missing=[];
    [['f-name',!name,'your name'],
     ['f-email',!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'a valid email'],
     ['f-msg',!msg,'a message']].forEach(function(t){
      var field=el(t[0]).closest('.field');
      field.classList.toggle('is-error',t[1]);
      if(t[1]){ el(t[0]).setAttribute('aria-invalid','true'); missing.push(t[2]); }
      else el(t[0]).removeAttribute('aria-invalid');
    });
    if(missing.length){
      status.textContent='Still needed: '+
        (missing.length>1
          ? missing.slice(0,-1).join(', ')+' and '+missing[missing.length-1]
          : missing[0])+'.';
      form.querySelector('.is-error input,.is-error textarea').focus();
      return;
    }

    submitBtn.setAttribute('disabled','');
    status.textContent='Sending…';

    deliver({name:name, email:email, company:brand, message:msg, ts:FORM_LOADED})
      .then(function(d){
        if(d && d.success){
          form.reset();
          status.textContent='Thanks — that reached me. I reply to every brand enquiry.';
        } else if(d && d.error==='rate_limited'){
          /* the backend's flood cap, not a failure on their side */
          submitBtn.removeAttribute('disabled');
          status.textContent='The form is over its limit for now. Email hey@heysamtheman.com and it reaches me just the same.';
        } else { throw new Error('rejected'); }
      })
      .catch(function(){
        submitBtn.removeAttribute('disabled');
        status.textContent='That did not send. Email hey@heysamtheman.com instead.';
      });
  });

  /* ── earlier expeditions fold ── */
  var moreBtn=document.getElementById('moreBtn');
  if(moreBtn){
    var moreLabel=document.getElementById('moreLabel');
    var moreIcon=document.getElementById('moreIcon');
    var hiddenRows=[].slice.call(document.querySelectorAll('#miniList .is-more'));
    moreBtn.addEventListener('click',function(){
      var open=moreBtn.getAttribute('aria-expanded')==='true';
      hiddenRows.forEach(function(r){ r.hidden=open; });
      moreBtn.setAttribute('aria-expanded',String(!open));
      moreLabel.textContent=open?'Show earlier adventures':'Show fewer';
      moreIcon.firstElementChild.setAttribute('href',open?'#i-down':'#i-up');
    });
  }

  /* ── brands banner ────────────────────────────────────────────────
     The row is drawn as wordmarks, in type. It used to render an <img>
     per brand from img/brands/<slug>.svg with a text fallback on error —
     but that folder is empty, so every load fired 19 requests (38 with
     the duplicated track) that GitHub Pages answered with a full 404
     HTML page: ~83 KB of nothing, competing with the hero for bandwidth
     on a phone. Removed 23 Sep 2026.

     TO PUT REAL LOGOS BACK: set USE_LOGO_FILES to true below and drop
     the files into img/brands/ using the slugs in BRANDS. Only turn it
     on for slugs whose file actually exists — an absent file costs a
     404 round trip before the wordmark appears.
     ──────────────────────────────────────────────────────────────── */
  var BRANDS = [
    ['Patagonia','patagonia'], ['The North Face','the-north-face'],
    ['Simond','simond'], ['Petzl','petzl'], ['Decathlon','decathlon'],
    ['La Sportiva','la-sportiva'], ['Scarpa','scarpa'], ['Ray-Ban','ray-ban'],
    ['Oakley','oakley'], ['GoPro','gopro'], ['Insta360','insta360'],
    ['Garmin','garmin'], ['Nike','nike'], ['Adidas','adidas'],
    ['Jetboil','jetboil'], ['Black Diamond','black-diamond'],
    ['Icebreaker','icebreaker'], ['Montbell','montbell'],
    ['Ortovox','ortovox']
  ];
  var track=document.getElementById('brandTrack');
  if(track){
    var USE_LOGO_FILES = false;
    var makeItem=function(name,slug){
      var d=document.createElement('div'); d.className='marquee__i';
      var child;
      if(USE_LOGO_FILES){
        child=document.createElement('img');
        child.src='img/brands/'+slug+'.svg'; child.alt=name; child.loading='lazy';
        child.addEventListener('error',function(){
          var t=document.createElement('span'); t.textContent=name;
          if(child.parentNode) child.parentNode.replaceChild(t,child);
        });
      } else {
        child=document.createElement('span'); child.textContent=name;
      }
      d.appendChild(child); return d;
    };
    /* the list is laid down twice so translateX(-50%) loops seamlessly.
       the second pass is decorative: hidden from screen readers, and
       hidden outright when the animation is off. */
    for(var pass=0; pass<2; pass++){
      BRANDS.forEach(function(b){
        var it=makeItem(b[0],b[1]);
        if(pass===1){ it.setAttribute('data-dup',''); it.setAttribute('aria-hidden','true'); }
        track.appendChild(it);
      });
    }
  }

  /* ── Reels carousel, self-hosted ──────────────────────────────────
     Nothing loads from Instagram. Each entry maps to three things:
       img/video/reel-<id>.mp4   10s, muted, 540px wide
       img/reel-<id>.jpg     poster, shown until the clip is on screen
       instagram.com/reel/<id>/   where the card links
     To change the line-up, edit this array and drop the matching files
     in. Order here is the order on the page. Leave views:'' and the
     line under the card is blank but still reserves its height, so the
     cards stay aligned.
     ──────────────────────────────────────────────────────────────── */
  /* ── The rail: Reels and stills, alternating ──────────────────────
     kind:'reel'  → img/video/reel-<id>.mp4 + img/reel-<id>.jpg, autoplays
                    muted when the card is on screen
     kind:'post'  → img/<img>.jpg, a square still that never moves
     Alternating is deliberate: it halves how much is moving at once
     without giving up any Reels. Order here is the order on the page.
     `n` is the figure printed under the card — views for a Reel, likes
     for a post — and `unit` is the word beside it. Leave n:'' and the
     line still reserves its height so the cards stay aligned.
     ──────────────────────────────────────────────────────────────── */
  /* `place` is kept for reference only — the cards print the caption alone. */
  var REELS = [
    {kind:'reel', id:'Dc4YskjK6tQ', n:'3.2M',  unit:'views',
     cap:'The climb down from 4,400\u00a0m on the Matterhorn'},
    {kind:'post', img:'post-fuji', n:'165', unit:'likes',
     cap:'Skiing Mount Fuji in May', place:'Mount Fuji, Japan'},
    {kind:'reel', id:'DU0MF8hE7FJ', n:'20.4K', unit:'views',
     cap:'Mount Yotei summit, six hours up'},
    {kind:'post', img:'post-japan-alps', n:'79', unit:'likes',
     cap:'Five friends, five days in the Japanese Alps', place:'My\u014dk\u014d, Niigata'},
    {kind:'reel', id:'DcwqegrKaXQ', n:'153K',  unit:'views',
     cap:'Sunrise on the 4,478\u00a0m Matterhorn'},
    {kind:'post', img:'post-kilimanjaro', n:'92', unit:'likes',
     cap:'Shira Cave Camp, 3,750\u00a0m on Kilimanjaro', place:'Kilimanjaro, Tanzania'},
    {kind:'reel', id:'DbGLmKsKX6M', n:'13.5K', unit:'views',
     cap:'Paragliding over Lake Annecy at golden hour'}
  ];

  var rail  = document.getElementById('reels');
  var lblEl = document.getElementById('reelLbl');
  if(lblEl) lblEl.textContent = 'Reels & posts';
  if(rail && REELS.length){
    var PROFILE = 'https://www.instagram.com/hey_samtheman/';
    /* Poster widths. Each card ships at 360 and 540 px wide; `sizes` mirrors
       the CSS — 44vh tall at 9:16 on phones (44 × 9/16 = 24.75vh), the
       clamp() from .reel above that — so the browser picks 360 on a 1–1.75×
       screen and 540 on a 2–3× one. Added 24 Sep 2026 (Lighthouse pass). */
    var POSTER_SIZES = '(max-width:52rem) 24.75vh, clamp(13rem,19vw,16rem)';
    rail.innerHTML = REELS.map(function(r){
      var media, href;
      if(r.kind === 'post'){
        href  = r.href || PROFILE;
        media = '<picture><source type="image/avif" srcset="img/' + r.img + '-360.avif 360w, img/' + r.img + '.avif 540w" sizes="' + POSTER_SIZES + '">'
              + '<img src="img/' + r.img + '.jpg" srcset="img/' + r.img + '-360.jpg 360w, img/' + r.img + '.jpg 540w" sizes="' + POSTER_SIZES + '" width="540" height="960" alt="" loading="lazy" decoding="async"></picture>'
              + '<span class="reel__veil"></span>'
              + '<span class="reel__cap">' + r.cap + '</span>';
      } else {
        href  = 'https://www.instagram.com/reel/' + r.id + '/';
        media = '<picture><source type="image/avif" srcset="img/reel-' + r.id + '-360.avif 360w, img/reel-' + r.id + '.avif 540w" sizes="' + POSTER_SIZES + '">'
              + '<img src="img/reel-' + r.id + '.jpg" srcset="img/reel-' + r.id + '-360.jpg 360w, img/reel-' + r.id + '.jpg 540w" sizes="' + POSTER_SIZES + '" width="540" height="960" alt="" loading="lazy" decoding="async"></picture>'
              + '<video muted loop playsinline preload="none" tabindex="-1" aria-hidden="true"'
              +   ' data-src="img/video/reel-' + r.id + '.mp4"></video>'
              + '<span class="reel__veil"></span>'
              + '<span class="reel__cap">' + r.cap + '</span>';
      }
      /* the view count sits on the clip itself, top left, the way it does in
         the app. Stills get nothing — their like counts are small enough
         that printing them works against the page. */
      var badge = (r.kind === 'reel' && r.n)
        ? '<span class="reel__v"><svg class="ic ic--sm" aria-hidden="true"><use href="#i-eye"/></svg>'
          + r.n + '</span>'
        : '';
      return '<article class="reel reel--' + r.kind + '">'
        +   '<a class="reel__card" href="' + href + '" target="_blank" rel="noopener">'
        +     media
        +     badge
        +     '<span class="reel__sr">Open on Instagram</span>'
        +   '</a>'
        + '</article>';
    }).join('');

    var vids = [].slice.call(rail.querySelectorAll('video'));

    /* Play only the clips that are on screen, and only once the section
       itself is in view — otherwise five decoders run for nobody. The
       poster carries the card until then, so a clip that never loads
       still looks finished rather than broken. */
    var onScreen = [], railIn = false;
    function sync(){
      vids.forEach(function(v){
        var want = !reduce && railIn && onScreen.indexOf(v) > -1;
        if(want){
          if(!v.src) v.src = v.dataset.src;
          var p = v.play();
          if(p && p['catch']) p['catch'](function(){});
          v.classList.add('is-on');
        } else {
          if(!v.paused) v.pause();
          v.classList.remove('is-on');
        }
      });
    }

    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        railIn = es[0].isIntersecting; sync();
      }, {threshold:.15}).observe(rail);

      var cardIO = new IntersectionObserver(function(es){
        es.forEach(function(e){
          var i = onScreen.indexOf(e.target);
          if(e.isIntersecting && i < 0) onScreen.push(e.target);
          else if(!e.isIntersecting && i > -1) onScreen.splice(i,1);
        });
        sync();
      }, {root:rail, threshold:.6});
      vids.forEach(function(v){ cardIO.observe(v); });
    }

    /* arrows */
    var prev = document.querySelector('.rnav--prev'),
        next = document.querySelector('.rnav--next');
    function step(){
      var c = rail.querySelector('.reel');
      return c ? c.getBoundingClientRect().width + 16 : rail.clientWidth * .8;
    }
    var railNav = document.querySelector('.reelrail__nav');
    function edges(){
      if(!prev || !next) return;
      var max = rail.scrollWidth - rail.clientWidth;
      /* a 40px overflow is not worth a pair of arrows */
      if(railNav) railNav.hidden = max <= 48;
      prev.disabled = rail.scrollLeft <= 4;
      next.disabled = rail.scrollLeft >= max - 4;
    }
    if(prev) prev.addEventListener('click', function(){ rail.scrollBy({left:-step()*2, behavior: reduce?'auto':'smooth'}); });
    if(next) next.addEventListener('click', function(){ rail.scrollBy({left: step()*2, behavior: reduce?'auto':'smooth'}); });
    rail.addEventListener('scroll', edges, {passive:true});
    addEventListener('resize', edges);
    edges();

    /* drag to scroll with a mouse; touch already scrolls natively */
    var down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', function(e){
      if(e.pointerType === 'touch') return;
      down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft;
      rail.classList.add('is-drag');
    });
    addEventListener('pointermove', function(e){
      if(!down) return;
      var d = e.clientX - sx;
      moved = Math.max(moved, Math.abs(d));
      rail.scrollLeft = sl - d;
    });
    function release(){
      if(!down) return;
      down = false; rail.classList.remove('is-drag'); edges();
    }
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    /* a drag that ends on a card must not open Instagram */
    rail.addEventListener('click', function(e){
      if(moved > 6){ e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);
  }

  /* ── hero line ───────────────────────────────────────────────────
     The rounded, cross-platform figures. They live in metrics.js like
     every other number on the site, so there is still one place to
     edit them. ─────────────────────────────────────────────────────── */
  var HERO = (window.SAM_METRICS && window.SAM_METRICS.hero) || null;
  if(HERO){
    document.querySelectorAll('[data-hero]').forEach(function(el){
      var v = HERO[el.getAttribute('data-hero')];
      if(v) el.textContent = v;
    });
  }

  /* ── audience: icon tabs swapping one panel of bars ───────────────
     Numbers live in metrics.js. Each dimension is its own single-series
     breakdown, so one hue does for all of them; the row label and the
     printed value carry the meaning, never colour alone.
     ──────────────────────────────────────────────────────────────── */
  var dash = document.getElementById('audDash');
  var AUD  = (window.SAM_METRICS && window.SAM_METRICS.audience) || null;
  if(dash && AUD){
    /* age opens the panel: it is the dimension a brand actually reads first.
       Gender in the middle, location last. */
    var DIMS = [
      {id:'age',       label:'Age',      icon:'i-clock', rows:AUD.age},
      {id:'gender',    label:'Gender',   icon:'i-users', rows:AUD.gender},
      {id:'countries', label:'Location', icon:'i-globe', rows:AUD.countries}
    ].filter(function(d){ return d.rows && d.rows.length; });

    if(DIMS.length){
      dash.innerHTML =
          '<div class="tabs" role="tablist" aria-label="Audience breakdown">'
        +   DIMS.map(function(d, i){
              return '<button class="tab" type="button" role="tab" id="tab-' + d.id + '"'
                +   ' aria-controls="panel-aud" aria-selected="' + (i === 0) + '"'
                +   ' tabindex="' + (i === 0 ? '0' : '-1') + '">'
                +   '<svg class="ic" aria-hidden="true"><use href="#' + d.icon + '"/></svg>'
                +   d.label + '</button>';
            }).join('')
        + '</div>'
        + '<div class="dash__panel" id="panel-aud" role="tabpanel" aria-live="polite"></div>';

      var panel = dash.querySelector('#panel-aud');
      var tabs  = [].slice.call(dash.querySelectorAll('.tab'));
      var seen  = false;

      var grow = function(){
        /* the rows were just written, so let layout settle or the
           transition has nothing to animate from */
        requestAnimationFrame(function(){
          [].slice.call(panel.querySelectorAll('.dash__f')).forEach(function(f){
            f.style.width = f.getAttribute('data-w') + '%';
          });
        });
      };

      var draw = function(i){
        var d = DIMS[i];
        var max = Math.max.apply(null, d.rows.map(function(r){ return r.v; })) || 1;
        panel.setAttribute('aria-labelledby', 'tab-' + d.id);
        panel.innerHTML = d.rows.map(function(r){
          return '<div class="dash__r">'
            +   '<div class="dash__t">'
            +     '<span class="dash__l">' + r.k + '</span>'
            +     '<span class="dash__v">' + r.v.toFixed(1) + '<small>%</small></span>'
            +   '</div>'
            +   '<div class="dash__b"><i class="dash__f" data-w="'
            +     (r.v / max * 100).toFixed(1) + '"></i></div>'
            + '</div>';
        }).join('');
        if(seen) grow();
      };

      var select = function(i, focus){
        tabs.forEach(function(t, j){
          t.setAttribute('aria-selected', j === i);
          t.tabIndex = j === i ? 0 : -1;
        });
        draw(i);
        if(focus) tabs[i].focus();
      };

      tabs.forEach(function(t, i){
        t.addEventListener('click', function(){ select(i); });
        t.addEventListener('keydown', function(e){
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if(!d) return;
          e.preventDefault();
          select((i + d + tabs.length) % tabs.length, true);
        });
      });

      draw(0);
      if(reduce || !('IntersectionObserver' in window)){ seen = true; grow(); }
      else {
        var dIO = new IntersectionObserver(function(es){
          if(!es[0].isIntersecting) return;
          dIO.disconnect(); seen = true; grow();
        }, {threshold:.25});
        dIO.observe(dash);
      }
    }
  }

  /* number ticker */
  if(!reduce && 'IntersectionObserver' in window){
    var fmt=function(n){return n.toLocaleString('en-US')};
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        io.unobserve(en.target);
        var el=en.target, to=parseInt(el.dataset.to,10), t0=null, dur=1100;
        var step=function(t){
          if(!t0) t0=t;
          var p=Math.min((t-t0)/dur,1);
          el.textContent=fmt(Math.round(to*(1-Math.pow(1-p,4))));
          if(p<1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },{threshold:.4});
    document.querySelectorAll("[data-to]").forEach(function(el){io.observe(el)});
  }

  /* nav scroll-spy */
  if('IntersectionObserver' in window){
    var links={};
    document.querySelectorAll('.nav__links a').forEach(function(a){
      if(a.hash) links[a.hash.slice(1)]=a;
    });
    var spy=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var a=links[en.target.id];
        if(a) a.classList.toggle('is-active',en.isIntersecting);
      });
    },{rootMargin:'-45% 0px -50% 0px'});
    ['audience','expeditions','work'].forEach(function(id){
      var el=document.getElementById(id); if(el) spy.observe(el);
    });
  }
})();
