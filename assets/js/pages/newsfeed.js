/* ==========================================================================
   GG Learning Labs — Newsfeed
   Admins publish posts with an optional image; everyone reads, likes, comments.
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils, UI = GGL.ui, S = GGL.services;
  var CATEGORIES = ['Announcement', 'New course', 'Update', 'Event', 'Recognition', 'Notice'];
  var state = { category: 'all', search: '' };
  var expanded = {};
  var feedEl;

  function catTone(c) {
    return ({ 'Announcement': 'accent', 'New course': 'success', 'Update': 'info',
      'Event': 'warning', 'Recognition': 'success', 'Notice': 'plain' })[c] || 'plain';
  }
  function canPublish() {
    var u = S.auth.getUser();
    return u && u.role !== GGL.ROLES.END_USER;
  }

  function openCompose(post) {
    var isEdit = !!post;
    post = post || {};
    var imageData = post.image || null;

    var handle = UI.modal({
      title: isEdit ? 'Edit post' : 'New post',
      subtitle: 'Published to everyone on the platform.',
      size: 'lg',
      body: '<form id="post-form" novalidate>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="pf-cat">Category</label>' +
            '<select class="select" id="pf-cat" name="category">' +
              CATEGORIES.map(function (c) {
                return '<option' + (post.category === c ? ' selected' : '') + '>' + c + '</option>';
              }).join('') + '</select></div>' +
          '<div class="field" style="display:flex;align-items:flex-end">' +
            '<label class="check" style="margin:0 0 var(--sp-2)">' +
              '<input type="checkbox" name="pinned"' + (post.pinned ? ' checked' : '') + '>' +
              '<span>Pin to the top of the feed</span></label></div></div>' +
        '<div class="field"><label class="label" for="pf-title">Title <span class="req">*</span></label>' +
          '<input class="input" id="pf-title" name="title" value="' + U.esc(post.title || '') + '" ' +
          'placeholder="What is the headline?"></div>' +
        '<div class="field"><label class="label" for="pf-body">Post <span class="req">*</span></label>' +
          '<textarea class="textarea" id="pf-body" name="body" style="min-height:150px" ' +
          'placeholder="Write the update. Keep it clear and useful.">' + U.esc(post.body || '') + '</textarea></div>' +
        '<div class="field"><span class="label">Image ' +
          '<span class="text-subtle" style="font-weight:400">(optional)</span></span>' +
          '<div class="image-drop" data-drop tabindex="0" role="button" ' +
            'aria-label="Add an image — click or drop a file">' +
            '<input type="file" accept="image/*" data-file hidden>' +
            '<div data-drop-empty' + (imageData ? ' hidden' : '') + '>' + GGL.icon('image', 'ico') +
              '<div class="fw-medium text-sm mt-2">Click to choose, or drop an image here</div>' +
              '<div class="text-xs text-muted">PNG or JPG, up to 2 MB</div></div>' +
            '<div data-drop-preview' + (imageData ? '' : ' hidden') + '>' +
              '<img data-preview alt="Selected image preview"' +
                (imageData ? ' src="' + imageData + '"' : '') + '>' +
              '<button type="button" class="btn btn-sm btn-danger-ghost mt-3" data-remove-image>' +
                GGL.icon('trash', 'ico') + '<span>Remove image</span></button></div></div>' +
          '<span class="hint">Images are held in this browser only — nothing is uploaded to a server.</span>' +
        '</div></form>',
      footer: '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
        '<button type="submit" form="post-form" class="btn btn-primary">' +
        GGL.icon(isEdit ? 'check' : 'send', 'ico') +
        '<span>' + (isEdit ? 'Save changes' : 'Publish post') + '</span></button>'
    });

    var form = handle.overlay.querySelector('#post-form');
    var drop = form.querySelector('[data-drop]');
    var fileInput = form.querySelector('[data-file]');
    var preview = form.querySelector('[data-preview]');
    var emptyEl = form.querySelector('[data-drop-empty]');
    var previewEl = form.querySelector('[data-drop-preview]');

    function loadFile(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) { UI.toast('That is not an image', { type: 'error' }); return; }
      if (file.size > 2 * 1024 * 1024) {
        UI.toast('Image is too large', { type: 'error', desc: 'Keep it under 2 MB.' }); return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        imageData = e.target.result;
        preview.src = imageData;
        emptyEl.hidden = true;
        previewEl.hidden = false;
      };
      reader.readAsDataURL(file);
    }

    drop.addEventListener('click', function (e) {
      if (e.target.closest('[data-remove-image]')) return;
      fileInput.click();
    });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    fileInput.addEventListener('change', function () { loadFile(this.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      loadFile(e.dataTransfer.files && e.dataTransfer.files[0]);
    });
    form.querySelector('[data-remove-image]').addEventListener('click', function (e) {
      e.stopPropagation();
      imageData = null; fileInput.value = '';
      preview.removeAttribute('src');
      emptyEl.hidden = false; previewEl.hidden = true;
    });

    handle.overlay.querySelector('[data-cancel]').addEventListener('click', handle.close);

    UI.handleSubmit(form, {
      title: [U.validators.required, U.validators.min(6)],
      body: [U.validators.required, U.validators.min(20)]
    }, function (v) {
      var payload = { title: v.title, body: v.body, category: v.category,
        pinned: !!v.pinned, image: imageData };
      return isEdit ? S.feed.update(post.id, payload) : S.feed.publish(payload);
    }, {
      success: isEdit ? 'Post updated' : 'Post published',
      successDesc: isEdit ? null : 'It is now visible to everyone on the platform.',
      onDone: function () { handle.close(); load(); }
    });
  }

  function postCard(p, me) {
    var liked = (p.likedBy || []).indexOf(me.id) !== -1;
    var mine = p.authorId === me.id;
    var isAdmin = me.role !== GGL.ROLES.END_USER;

    return '<article class="post" data-post="' + U.esc(p.id) + '">' +
      (p.pinned ? '<div class="post-pin">' + GGL.icon('star', 'ico') + '<span>Pinned</span></div>' : '') +
      '<header class="post-head">' +
        '<span class="avatar">' + U.esc(U.initials(p.author)) + '</span>' +
        '<div class="grow"><div class="post-author">' + U.esc(p.author) +
          '<span class="post-role">' + U.esc(p.authorRole) + '</span></div>' +
          '<div class="post-time">' + U.relative(p.createdAt) + ' · ' + U.date(p.createdAt) + '</div></div>' +
        '<span class="badge badge-' + catTone(p.category) + '">' + U.esc(p.category) + '</span>' +
        (isAdmin ? '<div class="dropdown" data-dropdown>' +
            '<button type="button" class="btn-icon btn-sm" data-dropdown-trigger ' +
              'aria-haspopup="true" aria-expanded="false" aria-label="Post actions">' +
              GGL.icon('moreVertical', 'ico') + '</button><div class="menu">' +
              '<button type="button" class="menu-item" data-pin="' + U.esc(p.id) + '">' +
                GGL.icon('star', 'ico') + '<span>' + (p.pinned ? 'Unpin' : 'Pin to top') + '</span></button>' +
              (mine || me.role === GGL.ROLES.SUPER_ADMIN
                ? '<button type="button" class="menu-item" data-edit="' + U.esc(p.id) + '">' +
                  GGL.icon('edit', 'ico') + '<span>Edit post</span></button><div class="menu-sep"></div>' +
                  '<button type="button" class="menu-item danger" data-delete="' + U.esc(p.id) + '">' +
                  GGL.icon('trash', 'ico') + '<span>Delete post</span></button>' : '') +
            '</div></div>' : '') +
      '</header>' +
      '<h3 class="post-title">' + U.esc(p.title) + '</h3>' +
      '<div class="post-body">' + U.esc(p.body) + '</div>' +
      (p.image ? '<img class="post-image" src="' + p.image + '" alt="Attached to: ' + U.esc(p.title) + '">' : '') +
      '<footer class="post-foot">' +
        '<button type="button" class="post-action' + (liked ? ' liked' : '') + '" ' +
          'data-like="' + U.esc(p.id) + '" aria-pressed="' + liked + '">' +
          GGL.icon('star', 'ico') + '<span data-like-count>' + p.likes + '</span>' +
          '<span class="sr-only">likes</span></button>' +
        '<button type="button" class="post-action" data-toggle-comments="' + U.esc(p.id) + '">' +
          GGL.icon('messageCircle', 'ico') + '<span>' + p.commentCount + '</span>' +
          '<span class="post-action-label">' + (p.commentCount === 1 ? 'comment' : 'comments') + '</span></button>' +
      '</footer>' +
      '<div class="post-comments" data-comments="' + U.esc(p.id) + '"' +
        (expanded[p.id] ? '' : ' hidden') + '></div></article>';
  }

  function renderComments(postId, container, me) {
    container.innerHTML = '<div class="skel skel-row"></div>';
    S.feed.commentsFor(postId).then(function (rows) {
      container.innerHTML = (rows.length
        ? rows.map(function (c) {
            var canDelete = c.authorId === me.id || me.role !== GGL.ROLES.END_USER;
            return '<div class="comment">' +
              '<span class="avatar avatar-sm">' + U.esc(U.initials(c.author)) + '</span>' +
              '<div class="grow"><div class="comment-head">' +
                '<strong>' + U.esc(c.author) + '</strong>' +
                '<span class="comment-role">' + U.esc(c.authorRole) + '</span>' +
                '<span class="comment-time">' + U.relative(c.createdAt) + '</span>' +
                (canDelete ? '<button type="button" class="btn-icon btn-sm comment-del" ' +
                  'data-del-comment="' + U.esc(c.id) + '" aria-label="Delete comment">' +
                  GGL.icon('trash', 'ico') + '</button>' : '') + '</div>' +
              '<div class="comment-body">' + U.esc(c.body) + '</div></div></div>';
          }).join('')
        : '<p class="text-sm text-muted" style="padding:var(--sp-2) 0">No comments yet. Be the first to reply.</p>') +
        '<form class="comment-form" data-comment-form="' + U.esc(postId) + '">' +
          '<span class="avatar avatar-sm">' + U.esc(U.initials(me.name)) + '</span>' +
          '<input class="input" name="body" placeholder="Write a comment…" ' +
            'aria-label="Write a comment" maxlength="500">' +
          '<button type="submit" class="btn btn-primary btn-sm">' +
            GGL.icon('send', 'ico') + '<span class="hide-sm">Post</span></button></form>';

      var form = container.querySelector('[data-comment-form]');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.elements.body;
        var text = input.value.trim();
        if (!text) { UI.toast('Write something first', { type: 'warning' }); return; }
        var btn = form.querySelector('button');
        btn.classList.add('is-loading');
        btn.disabled = true;
        S.feed.addComment(postId, text).then(function () {
          input.value = '';
          renderComments(postId, container, me);
          var counter = document.querySelector('[data-toggle-comments="' + postId + '"] span');
          if (counter) counter.textContent = Number(counter.textContent) + 1;
          UI.toast('Comment posted', { type: 'success', duration: 1800 });
        }).catch(function (err) {
          btn.classList.remove('is-loading');
          btn.disabled = false;
          UI.toast('Could not comment', { type: 'error', desc: err.message });
        });
      });

      U.$$('[data-del-comment]', container).forEach(function (btn) {
        btn.addEventListener('click', function () {
          UI.confirm({ title: 'Delete this comment?', message: 'It will be removed from the post.',
            confirmLabel: 'Delete',
            onConfirm: function () {
              return S.feed.deleteComment(btn.getAttribute('data-del-comment')).then(function () {
                renderComments(postId, container, me);
                var counter = document.querySelector('[data-toggle-comments="' + postId + '"] span');
                if (counter) counter.textContent = Math.max(0, Number(counter.textContent) - 1);
                UI.toast('Comment deleted', { type: 'success', duration: 1800 });
              });
            }});
        });
      });
    });
  }

  function load() {
    var me = S.auth.getUser();
    feedEl.innerHTML = '<div class="card card-pad mb-4"><div class="skel skel-title"></div>' +
      '<div class="skel skel-text w-100"></div><div class="skel skel-text w-80"></div></div>' +
      '<div class="card card-pad"><div class="skel skel-title"></div>' +
      '<div class="skel skel-text w-100"></div></div>';

    return S.feed.timeline(state).then(function (rows) {
      if (!rows.length) {
        feedEl.innerHTML = '<div class="card">' + UI.empty({ icon: 'megaphone',
          title: state.search || state.category !== 'all' ? 'No matching posts' : 'Nothing posted yet',
          message: state.search || state.category !== 'all'
            ? 'Try a different search or category.'
            : 'Announcements and updates will appear here.',
          action: canPublish() ? 'Write the first post' : null }) + '</div>';
        var act = feedEl.querySelector('[data-empty-action]');
        if (act) act.addEventListener('click', function () { openCompose(); });
        return;
      }

      feedEl.innerHTML = rows.map(function (p) { return postCard(p, me); }).join('');
      UI.initDropdowns();

      Object.keys(expanded).forEach(function (id) {
        if (!expanded[id]) return;
        var box = feedEl.querySelector('[data-comments="' + id + '"]');
        if (box) { box.hidden = false; renderComments(id, box, me); }
      });

      U.$$('[data-like]', feedEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          S.feed.toggleLike(btn.getAttribute('data-like')).then(function (res) {
            btn.classList.toggle('liked', res.liked);
            btn.setAttribute('aria-pressed', String(res.liked));
            btn.querySelector('[data-like-count]').textContent = res.likes;
          }).catch(function (err) {
            UI.toast('Could not register that', { type: 'error', desc: err.message });
          });
        });
      });

      U.$$('[data-toggle-comments]', feedEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-toggle-comments');
          var box = feedEl.querySelector('[data-comments="' + id + '"]');
          var open = !box.hidden;
          box.hidden = open;
          expanded[id] = !open;
          if (!open) renderComments(id, box, me);
        });
      });

      U.$$('[data-pin]', feedEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-pin');
          var p = rows.filter(function (x) { return x.id === id; })[0];
          S.feed.togglePin(id, !p.pinned).then(function () {
            UI.toast(p.pinned ? 'Post unpinned' : 'Post pinned', { type: 'success' });
            load();
          });
        });
      });

      U.$$('[data-edit]', feedEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          openCompose(rows.filter(function (x) { return x.id === btn.getAttribute('data-edit'); })[0]);
        });
      });

      U.$$('[data-delete]', feedEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var p = rows.filter(function (x) { return x.id === btn.getAttribute('data-delete'); })[0];
          UI.confirm({ title: 'Delete this post?',
            message: '\u201C' + p.title + '\u201D and its comments will be removed from the feed.',
            confirmLabel: 'Delete post',
            onConfirm: function () {
              return S.feed.remove(p.id).then(function () {
                UI.toast('Post deleted', { type: 'success' }); load();
              });
            }});
        });
      });
    });
  }

  function init() {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }

    var body = GGL.shell.mount({
      active: 'newsfeed', title: 'Newsfeed',
      subtitle: 'Announcements, updates and recognition from across the organisation.',
      breadcrumbs: [{ label: 'Home', href: 'app/dashboard.html' }, { label: 'Newsfeed' }],
      actions: canPublish() ? '<button type="button" class="btn btn-primary" data-compose>' +
        GGL.icon('plus', 'ico') + '<span>New post</span></button>' : ''
    });
    if (!body) return;

    body.innerHTML = '<div class="split-2-1"><div>' +
        '<div class="card mb-5"><div class="toolbar">' +
          '<div class="search"><label class="input-icon">' +
            '<span class="sr-only">Search the feed</span>' + GGL.icon('search', 'ico') +
            '<input type="search" class="input" data-feed-search placeholder="Search posts…"></label></div>' +
          '<select class="select" data-feed-cat><option value="all">All categories</option>' +
            CATEGORIES.map(function (c) { return '<option>' + c + '</option>'; }).join('') +
          '</select></div></div>' +
        '<div id="feed"></div></div>' +
        '<div id="feed-side"></div></div>';

    feedEl = document.getElementById('feed');

    S.feed.timeline({}).then(function (rows) {
      var byCat = U.groupBy(rows, 'category');
      var top = rows.slice().sort(function (a, b) {
        return (b.likes + b.commentCount) - (a.likes + a.commentCount);
      }).slice(0, 4);

      document.getElementById('feed-side').innerHTML =
        (canPublish()
          ? '<div class="card card-pad mb-4"><strong class="text-sm">Posting as ' + U.esc(user.name) + '</strong>' +
            '<p class="text-xs text-muted mt-2 mb-4">Posts are visible to everyone on the platform, ' +
            'including learners.</p><button type="button" class="btn btn-primary btn-block btn-sm" data-compose-side>' +
            GGL.icon('plus', 'ico') + '<span>Write a post</span></button></div>'
          : '<div class="card card-pad mb-4"><strong class="text-sm">Reading the feed</strong>' +
            '<p class="text-xs text-muted mt-2" style="margin-bottom:0">You can like and comment on any ' +
            'post. Publishing is limited to administrators.</p></div>') +
        '<div class="card mb-4"><div class="card-head"><div><h3>Most discussed</h3>' +
        '<p class="sub">By reactions and comments</p></div></div><div class="card-body">' +
          (top.length ? '<ul class="session-list">' + top.map(function (p) {
              return '<li style="padding:var(--sp-3) 0"><span class="session-info">' +
                '<h4 class="truncate">' + U.esc(p.title) + '</h4><span class="meta">' +
                '<span>' + GGL.icon('star', 'ico') + p.likes + '</span>' +
                '<span>' + GGL.icon('messageCircle', 'ico') + p.commentCount + '</span></span></span></li>';
            }).join('') + '</ul>' : '<p class="text-sm text-muted">Nothing yet.</p>') + '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Categories</h3></div></div>' +
        '<div class="card-body"><div class="row gap-2 wrap">' +
          Object.keys(byCat).map(function (c) {
            return '<button type="button" class="chip" data-cat-chip="' + U.esc(c) + '">' +
              U.esc(c) + ' <strong>' + byCat[c].length + '</strong></button>';
          }).join('') + '</div></div></div>';

      var sideBtn = document.querySelector('[data-compose-side]');
      if (sideBtn) sideBtn.addEventListener('click', function () { openCompose(); });

      U.$$('[data-cat-chip]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          state.category = chip.getAttribute('data-cat-chip');
          document.querySelector('[data-feed-cat]').value = state.category;
          load();
        });
      });
    });

    var search = document.querySelector('[data-feed-search]');
    search.addEventListener('input', U.debounce(function () {
      state.search = search.value; load();
    }, 280));
    document.querySelector('[data-feed-cat]').addEventListener('change', function () {
      state.category = this.value; load();
    });
    var compose = document.querySelector('[data-compose]');
    if (compose) compose.addEventListener('click', function () { openCompose(); });

    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GGL = window.GGL || {});
