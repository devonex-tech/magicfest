document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const dialog = document.getElementById('videoDialog');
    const triggers = document.querySelectorAll('[data-video]');
    if (!dialog || !triggers.length) return;

    const video = dialog.querySelector('video');
    const closeBtn = dialog.querySelector('.video-dialog-close');
    const supported = typeof dialog.showModal === 'function';
    let opener = null;

    triggers.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (!supported) {
                window.location.href = btn.dataset.video;
                return;
            }
            opener = btn;
            video.poster = btn.dataset.poster || '';
            video.src = btn.dataset.video;
            dialog.setAttribute('aria-label', btn.getAttribute('aria-label') || '');
            dialog.showModal();
            video.play().catch(() => {});
        });
    });

    closeBtn.addEventListener('click', () => dialog.close());

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });

    dialog.addEventListener('close', () => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (opener) opener.focus();
    });
});
