const DEFAULT_KEY = 'simplenotes-content-v1';
const NAME_KEY = 'simplenotes-filename-v1';
const editor = document.getElementById('editor');
const statusLeft = document.getElementById('status-left');
const statusRight = document.getElementById('status-right');
const toast = document.getElementById('toast');
const menubuttons = Array.from(document.querySelectorAll('.menu'));
let deferredPrompt = null;
let isWordWrap = true;
let currentFilename = 'Untitled';

function showToast(text, ms=1200){
  toast.textContent = text;
  toast.classList.remove('hidden');
  setTimeout(()=>toast.classList.add('hidden'), ms);
}

function setTitle(name){
  const title = document.querySelector('.title-text');
  title.textContent = `${name} - Simple Notes`;
}

function saveContent(){
  const data = editor.value || '';
  localStorage.setItem(DEFAULT_KEY, data);
  localStorage.setItem(NAME_KEY, currentFilename);
  statusLeft.textContent = 'Saved';
  showToast('Saved');
}

function loadContent(){
  const data = localStorage.getItem(DEFAULT_KEY);
  const name = localStorage.getItem(NAME_KEY);
  if(data !== null){
    editor.value = data;
    updateCursorPos();
    statusLeft.textContent = 'Loaded';
    if(name) {
      currentFilename = name;
      setTitle(currentFilename);
    }
  }else{
    editor.value = '';
    currentFilename = 'Untitled';
    setTitle('Untitled');
  }
}

function newFile(){
  editor.value = '';
  currentFilename = 'Untitled';
  setTitle('Untitled');
  statusLeft.textContent = 'New file';
  updateCursorPos();
}

function updateCursorPos(){
  const pos = editor.selectionStart;
  const before = editor.value.slice(0,pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  statusRight.textContent = `Ln ${line}, Col ${col}`;
}

function toggleWordWrap(){
  if(isWordWrap){
    editor.style.whiteSpace = 'pre';
    isWordWrap = false;
    showToast('Word wrap off');
  }else{
    editor.style.whiteSpace = 'pre-wrap';
    isWordWrap = true;
    showToast('Word wrap on');
  }
}

document.addEventListener('keydown', (e)=>{
  if(e.key === 's' && (e.ctrlKey || e.metaKey)){
    e.preventDefault();
    saveContent();
  }
  if((e.key === 'w' && (e.ctrlKey || e.metaKey)) || e.key === 'F9'){
    e.preventDefault();
    toggleWordWrap();
  }
  if(e.key === 'Escape'){
    document.querySelectorAll('.menu').forEach(m=>m.classList.remove('open'));
  }
});

editor.addEventListener('input', ()=>{
  statusLeft.textContent = 'Editing';
  updateCursorPos();
  autoSaveDebounce();
});

editor.addEventListener('click', updateCursorPos);
editor.addEventListener('keyup', updateCursorPos);
editor.addEventListener('mouseup', updateCursorPos);

function autoSaveDebounce(){
  if(window._autoSaveTimer) clearTimeout(window._autoSaveTimer);
  window._autoSaveTimer = setTimeout(()=>{ saveContent(); }, 900);
}

menubuttons.forEach(menu => {
  menu.addEventListener('click', ev => {
    ev.stopPropagation();
    const wasOpen = menu.classList.contains('open');
    document.querySelectorAll('.menu').forEach(m => m.classList.remove('open'));
    if (!wasOpen) menu.classList.add('open');
  });
});

document.addEventListener('click', () => {
  document.querySelectorAll('.menu').forEach(m => m.classList.remove('open'));
});

document.addEventListener('click', ()=>{ document.querySelectorAll('.menu').forEach(m=>m.classList.remove('open')); });

document.getElementById('file-save').addEventListener('click', saveContent);
document.getElementById('file-new').addEventListener('click', newFile);
document.getElementById('format-wordwrap').addEventListener('click', toggleWordWrap);
document.getElementById('file-install').addEventListener('click', async ()=>{
  if(deferredPrompt){
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
  }else{
    showToast('Use your browser menu to install');
  }
});

document.getElementById('file-saveas').addEventListener('click', ()=>{
  const text = editor.value || '';
  const blob = new Blob([text], {type:'text/plain'});
  const suggested = (currentFilename && currentFilename !== 'Untitled') ? currentFilename : 'untitled.txt';
  const filename = prompt('Save as...', suggested) || suggested;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  currentFilename = filename;
  setTitle(currentFilename);
  saveContent();
  showToast('File downloaded');
});

window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  showToast('Install ready');
});

window.addEventListener('appinstalled', ()=>{
  deferredPrompt = null;
  showToast('App installed');
});

window.addEventListener('load', ()=>{
  loadContent();
  editor.style.whiteSpace = 'pre-wrap';
  adjustScale();
  registerServiceWorker();
  document.querySelectorAll('.menu').forEach(m => m.classList.remove('open'));

});

let resizeTimer;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>adjustScale(),120);
});

function adjustScale(){
  const win = document.getElementById('notepad-window');
  const baseW = 1000;
  const baseH = 700;
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  const scale = Math.min((vw*0.92)/baseW, (vh*0.86)/baseH, 1);
  if(!win.classList.contains('max')) win.style.transform = `scale(${scale})`;
}

function registerServiceWorker(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').then(()=>{}).catch(()=>{});
  }
}

function readFileFromInput(file){
  const r = new FileReader();
  r.onload = ()=>{
    editor.value = r.result;
    updateCursorPos();
    currentFilename = file.name || 'Untitled';
    setTitle(currentFilename);
    showToast('File loaded');
  };
  r.readAsText(file);
}

const dropArea = document.getElementById('notepad-window');
dropArea.addEventListener('dragover', (e)=>{ e.preventDefault(); });
dropArea.addEventListener('drop', (e)=>{
  e.preventDefault();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if(f) readFileFromInput(f);
});

document.getElementById('file-open').addEventListener('click', ()=>{
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.md,.log,.text';
  input.onchange = ()=>{ const f = input.files[0]; if(f) readFileFromInput(f); };
  input.click();
});

document.getElementById('edit-undo').addEventListener('click', ()=>{ document.execCommand('undo'); });
document.getElementById('edit-redo').addEventListener('click', ()=>{ document.execCommand('redo'); });
document.getElementById('edit-cut').addEventListener('click', ()=>{ document.execCommand('cut'); });
document.getElementById('edit-copy').addEventListener('click', ()=>{ document.execCommand('copy'); });
document.getElementById('edit-paste').addEventListener('click', ()=>{ document.execCommand('paste'); });
document.getElementById('edit-selectall').addEventListener('click', ()=>{ editor.select(); updateCursorPos(); });

document.getElementById('format-font').addEventListener('click', ()=>{
  const size = prompt('Set font size (px)', '14') || '14';
  editor.style.fontSize = `${parseInt(size,10) || 14}px`;
});

document.getElementById('help-about').addEventListener('click', ()=>{
  alert('Simple Notes\nWindows 95 style notepad\nOffline ready');
});

const titlebar = document.querySelector('.titlebar');
let dragging = false;
let dragOffset = {x:0,y:0};
titlebar.addEventListener('pointerdown', (e)=>{
  dragging = true;
  const win = document.getElementById('notepad-window');
  const rect = win.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  win.style.transition = 'none';
  titlebar.setPointerCapture(e.pointerId);
});
window.addEventListener('pointermove', (e)=>{
  if(!dragging) return;
  const win = document.getElementById('notepad-window');
  win.style.position = 'fixed';
  win.style.left = `${Math.max(6, e.clientX - dragOffset.x)}px`;
  win.style.top = `${Math.max(6, e.clientY - dragOffset.y)}px`;
});
window.addEventListener('pointerup', (e)=>{
  if(!dragging) return;
  dragging = false;
  const win = document.getElementById('notepad-window');
  win.style.transition = '';
  titlebar.releasePointerCapture(e.pointerId);
});

document.getElementById('close-btn').addEventListener('click', ()=>{
  window.open('', '_self');
  window.close();
});

document.getElementById('min-btn').addEventListener('click', ()=>{});

document.getElementById('max-btn').addEventListener('click', ()=>{
  const w = document.getElementById('notepad-window');
  if(!w.classList.contains('max')){
    w.dataset.prev = JSON.stringify({left:w.style.left, top:w.style.top, width:w.style.width, height:w.style.height});
    w.style.position = 'fixed';
    w.style.left = '0';
    w.style.top = '0';
    w.style.width = '100vw';
    w.style.height = '100vh';
    w.style.transform = 'scale(1)';
    w.classList.add('max');
  }else{
    const prev = JSON.parse(w.dataset.prev || '{}');
    w.style.left = prev.left || '';
    w.style.top = prev.top || '';
    w.style.width = prev.width || '';
    w.style.height = prev.height || '';
    adjustScale();
    w.classList.remove('max');
  }
});
