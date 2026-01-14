const loader = document.getElementById("site-loader");

let bgReady = false;
let depthReady = false;
let firstFrameRendered = false;




// ----------------------------------------------------
// 1. 탭 슬라이더
// ----------------------------------------------------
const buttons = document.querySelectorAll(".nav-btn");

buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    go(parseInt(btn.dataset.page, 10));
  });
});

// ----------------------------------------------------
// 2. 간단 트랙 플레이어
// ----------------------------------------------------
const trackItems = document.querySelectorAll(".track-item");
const commentCard = document.querySelector(".comment-card");
const audio = new Audio();

audio.volume = 0.7;

const playBtn = document.querySelector(".c-btn.play");
const prevBtn = document.querySelector(".c-btn.prev");
const nextBtn = document.querySelector(".c-btn.next");
const volumeSlider = document.querySelector(".volume-slider");
let targetVolume = volumeSlider.value / 100;
const FADE_IN_TIME = 120;   // ms
const FADE_OUT_TIME = 160; // ms

const visualizer = document.getElementById("visualizer");
const vctx = visualizer.getContext("2d");

let currentIndex = 0;

const trackList = [
  // Disc 1
  { disc: 1, index: 0, title: "Solenyx", file: "Solenyx.mp3" },
  { disc: 1, index: 1, title: "Revolve", file: "Revolve.mp3" },
  { disc: 1, index: 2, title: "pluto", file: "pluto.mp3" },

  // Disc 2
  { disc: 2, index: 0, title: "Open Portal", file: "Open Portal.mp3" },
  { disc: 2, index: 1, title: "Alertavoid", file: "Alertavoid.mp3" },
  { disc: 2, index: 2, title: "ujumia", file: "ujumia.mp3" }
];


/* === Web Audio API === */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const srcNode = audioCtx.createMediaElementSource(audio);

const analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 0.85;

const BAR_COUNT = 50;
const barValues = new Array(BAR_COUNT).fill(0);

function getLogIndex(i, len) {
  const minFreq = 20;
  const maxFreq = audioCtx.sampleRate / 2;
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);

  const scale = i / BAR_COUNT;
  const freq = Math.pow(10, logMin + (logMax - logMin) * scale);
  return Math.floor((freq / maxFreq) * len);
}


srcNode.connect(analyser);
analyser.connect(audioCtx.destination);

const buffer = new Uint8Array(analyser.frequencyBinCount);

function drawBarVisualizer() {
  requestAnimationFrame(drawBarVisualizer);

  analyser.getByteFrequencyData(buffer);
  vctx.clearRect(0, 0, visualizer.width, visualizer.height);

  const w = visualizer.width;
  const h = visualizer.height;
  const barW = w / BAR_COUNT;

  for (let i = 0; i < BAR_COUNT; i++) {
    const idx = getLogIndex(i, buffer.length);
    const raw = buffer[idx] / 255;

    const target = raw * h * 0.9;

    barValues[i] += (target - barValues[i]) * 0.35;

    const barH = Math.max(6, barValues[i]);

    const x = i * barW;
    const y = h - barH;

    vctx.beginPath();
    vctx.strokeStyle = "#ffffff";
    vctx.lineWidth = Math.max(2, barW * 0.45);
    vctx.lineCap = "round";
    vctx.moveTo(x + barW / 2, h);
    vctx.lineTo(x + barW / 2, y);
    vctx.stroke();
  }
}
drawBarVisualizer();


/* === Fade In / Fade Out === */
function fadeAudio(target, duration = 120) {
  const start = audio.volume;
  const diff = target - start;
  const steps = 24;
  const stepTime = duration / steps;
  let count = 0;

  const fade = setInterval(() => {
    count++;
    const t = count / steps;

    // ease-out curve (초반 빠름)
    const eased = 1 - Math.pow(1 - t, 3);

    audio.volume = start + diff * eased;

    if (count >= steps) {
      audio.volume = target;
      clearInterval(fade);
    }
  }, stepTime);
}


function playWithFade() {
  audio.volume = 0;
  audio.play();
  fadeAudio(0.2, 600);  // 0 → 0.2 으로 부드럽게 재생
}

function pauseWithFade() {
  fadeAudio(0, FADE_OUT_TIME);
  setTimeout(() => audio.pause(), FADE_OUT_TIME);
}


/* === 트랙 재생 === */
function playTrack(i) {
  currentIndex = i;
  const track = trackList[i];

  audio.src = "assets/" + track.file;
  audio.volume = 0;
  audio.play();
  fadeAudio(targetVolume, FADE_IN_TIME);

  audioCtx.resume();

  playBtn.classList.add("playing");
  updatePlayIcon(true); 

  // 코멘트 업데이트
  const c = comments[i];
  if (c) {
    document.getElementById("comment-title").textContent = c.title;
    document.getElementById("comment-body").textContent = c.body;
  }

  audio.onloadedmetadata = () => {
    document.getElementById("totalTime").textContent =
      formatTime(audio.duration);
  };
}

function updatePlayIcon(isPlaying) {
  playIcon.textContent = isPlaying ? "pause" : "play_arrow";
}



/* === 목록 클릭 === */
const allTracks = Array.from(
  document.querySelectorAll(".disc-panel .track-item")
);

allTracks.forEach((item, index) => {
  item.addEventListener("click", () => {
    playTrack(index);
  });
});


const playIcon = playBtn.querySelector('.material-symbols-rounded');
/* === 재생 / 정지 === */
playBtn.addEventListener("click", () => {
  if (!audio.src) return;

  if (audio.paused) {
    audio.volume = 0;
    audio.play();
    fadeAudio(targetVolume, FADE_IN_TIME);

    playBtn.classList.add("playing");
    playIcon.textContent = "pause"; 
  } else {
    pauseWithFade();

    playBtn.classList.remove("playing");
    playIcon.textContent = "play_arrow";
  }
});


audio.addEventListener("play", () => {
  playBtn.classList.add("playing");
});

audio.addEventListener("pause", () => {
  playBtn.classList.remove("playing");
});



/* === 볼륨 조절 === */
volumeSlider.addEventListener("input", () => {
  targetVolume = volumeSlider.value / 100;
  audio.volume = targetVolume;
  updateVolumeIcon(targetVolume);
});



function updateVolumeIcon(volume) {
  const icon = document.querySelector(".volume-icon");

  if (volume === 0) {
    icon.style.maskImage = "url('assets/icons/volume-off.svg')";
    icon.style.webkitMaskImage = "url('assets/icons/volume-off.svg')";
  } else if (volume < 0.7) {
    icon.style.maskImage = "url('assets/icons/volume-mid.svg')";
    icon.style.webkitMaskImage = "url('assets/icons/volume-mid.svg')";
  } else {
    icon.style.maskImage = "url('assets/icons/volume-max.svg')";
    icon.style.webkitMaskImage = "url('assets/icons/volume-max.svg')";
  }
}

function setDiscUI(disc) {
  document.querySelectorAll(".disc-btn")
    .forEach(b => b.classList.toggle("active", b.dataset.disc === String(disc)));

  document.querySelectorAll(".disc-panel")
    .forEach(p => p.classList.toggle("hidden", p.dataset.disc !== String(disc)));

  discDescription.textContent = descriptions[disc];
}

/* === 이전/다음곡 === */
prevBtn.addEventListener("click", () => {
  const cur = trackList[currentIndex];

  //  Disc 2 첫 곡 → Disc 1 마지막 곡
  if (cur.disc === 2 && cur.index === 0) {
    setDiscUI(1);

    const idx = trackList.findIndex(t =>
      t.disc === 1 && t.index === 2
    );
    playTrack(idx);
    return;
  }

  //  같은 Disc 이전 곡
  const prevIndex = trackList.findIndex(t =>
    t.disc === cur.disc && t.index === cur.index - 1
  );

  if (prevIndex !== -1) {
    playTrack(prevIndex);
  }
});

nextBtn.addEventListener("click", () => {
  const cur = trackList[currentIndex];

  //  Disc 2 마지막 → 완전 중지
  if (cur.disc === 2 && cur.index === 2) {
    stopPlaybackCompletely();
    return;
  }

  //  Disc 1 마지막 → Disc 2 첫 곡
  if (cur.disc === 1 && cur.index === 2) {
    setDiscUI(2);

    const idx = trackList.findIndex(t =>
      t.disc === 2 && t.index === 0
    );
    playTrack(idx);
    return;
  }

  //  같은 Disc 다음 곡
  const nextIndex = trackList.findIndex(t =>
    t.disc === cur.disc && t.index === cur.index + 1
  );

  if (nextIndex !== -1) {
    playTrack(nextIndex);
  }
});


const seekBar = document.getElementById("seekBar");
const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");

// 시간 포맷 변환용 함수 (초 → 0:00 형식)
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// 곡이 끝나면 행동 처리
audio.addEventListener("ended", () => {
  const cur = trackList[currentIndex];

  // Disc 2 마지막 곡 → 완전 중단
  if (cur.disc === 2 && cur.index === 2) {
    stopPlaybackCompletely();
    return;
  }

  // Disc 1 마지막 곡 → Disc 2 첫 곡
  if (cur.disc === 1 && cur.index === 2) {
    switchToDisc2AndPlay();
    return;
  }

  // 그 외 → 같은 Disc의 다음 곡
  const nextIndex = trackList.findIndex(t =>
    t.disc === cur.disc && t.index === cur.index + 1
  );

  if (nextIndex !== -1) {
    playTrack(nextIndex);
  }
});

function switchToDisc2AndPlay() {
  // 버튼
  document.querySelectorAll(".disc-btn").forEach(b => b.classList.remove("active"));
  document.querySelector('.disc-btn[data-disc="2"]').classList.add("active");

  // 패널
  document.querySelectorAll(".disc-panel").forEach(panel => {
    panel.classList.toggle("hidden", panel.dataset.disc !== "2");
  });

  // 설명
  discDescription.textContent = descriptions[2];

  // Disc 2 첫 곡
  const idx = trackList.findIndex(t => t.disc === 2 && t.index === 0);
  playTrack(idx);
}


function stopPlaybackCompletely() {
  pauseWithFade();
  audio.currentTime = 0;

  // active 트랙 표시 제거
  document.querySelectorAll(".track-item")
    .forEach(t => t.classList.remove("active"));
}


// 트랙 로드되면 전체길이 표시
audio.addEventListener("loadedmetadata", () => {
  totalTimeEl.textContent = formatTime(audio.duration);
});

// 재생 중 실시간 UI 업데이트
let lastAudioTime = 0;
let lastUpdate = 0;
let isPlaying = false;

audio.addEventListener("timeupdate", () => {
    lastAudioTime = audio.currentTime;
    lastUpdate = performance.now();
});

function smoothSeekUpdate() {
    requestAnimationFrame(smoothSeekUpdate);

    if (audio.duration && !audio.paused) {
        const progress = (audio.currentTime / audio.duration) * 100;
        seekBar.value = progress;
        currentTimeEl.textContent = formatTime(audio.currentTime);
    }
}
smoothSeekUpdate();



// 사용자가 seekBar를 움직이면 재생 위치 이동
seekBar.addEventListener("input", () => {
    if (!audio.duration) return;

    const newTime = (seekBar.value / 100) * audio.duration;
    audio.currentTime = newTime;
});


// ----------------------------------------------------
// 3. 입자 효과 (bgCanvas)
// ----------------------------------------------------
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}

resizeCanvas();
function updateSliderPosition(animate = false) {
  slider.style.transition = animate
    ? "transform .55s cubic-bezier(.22,1.1,.36,1)"
    : "none";

  slider.style.transform =
    `translateX(-${current * window.innerWidth}px)`;
}

window.addEventListener("resize", () => {
  updateSliderPosition(false);
});


const layer = document.querySelector('.particle-layer');

function createParticle() {
  const p = document.createElement('div');
  p.classList.add('particle');

  // 랜덤 크기 (9px ~ 18px)
  const size = Math.random() * 9 + 9;
  p.style.width = size + 'px';
  p.style.height = size + 'px';

  // 랜덤 위치
  p.style.left = Math.random() * window.innerWidth + 'px';
  p.style.top = (window.innerHeight + 50) + 'px';

  // 랜덤 속도 (5초 ~ 12초)
  const duration = Math.random() * 7 + 5;
  p.style.animationDuration = duration + 's';

  layer.appendChild(p);

  // 애니메이션 끝나면 제거
  setTimeout(() => p.remove(), duration * 1000);
}

// 0.4초마다 하나 생성 (너무 많지 않게)
setInterval(createParticle, 400);

// 초기 10개 미리 생성
for (let i = 0; i < 10; i++) createParticle();

// ----------------------------------------------------
// 4. 마우스 + 스크롤 패럴랙스 (배경만 살짝 움직임)
// ----------------------------------------------------
const parallaxStrength = 20;

window.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * parallaxStrength;
  const y = (e.clientY / window.innerHeight - 0.5) * parallaxStrength;

  const limit = 30; // px
const clampedX = Math.max(-limit, Math.min(limit, x));
const clampedY = Math.max(-limit, Math.min(limit, y));

document.body.style.backgroundPosition =
    `calc(50% + ${clampedX}px) calc(50% + ${clampedY}px)`;

});

window.addEventListener("scroll", () => {
  const y = window.scrollY * 0.03;
  const current = getComputedStyle(document.body).backgroundPosition.split(" ");
  const xPart = current[0] || "50%";
  document.body.style.backgroundPosition = `${xPart} calc(50% + ${y}px)`;
});

/* --------------------------------------------------------
   3D DEPTH PARALLAX ENGINE (NO TEARING VERSION)
--------------------------------------------------------- */

const bg = new Image();
bg.src = "assets/circle.jpg";

const depthImg = new Image();
depthImg.src = "assets/circle_depth.png";  

const renderCanvas = document.createElement("canvas");
const rctx = renderCanvas.getContext("2d");
document.body.appendChild(renderCanvas);

renderCanvas.style.position = "fixed";
renderCanvas.style.inset = "0";
renderCanvas.style.zIndex = "-3";
renderCanvas.style.pointerEvents = "none";

let depthData = null;
let depthW = 0;
let depthH = 0;

function resizeRenderCanvas() {
  const w = document.documentElement.clientWidth;
  const h = document.documentElement.clientHeight;

  renderCanvas.style.width = w + "px";
  renderCanvas.style.height = h + "px";

  renderCanvas.width = w;
  renderCanvas.height = h;
}

resizeRenderCanvas();
window.addEventListener("resize", resizeRenderCanvas);

// ---------------------------------------------
// 🔥 depth-map 로드 후 픽셀 추출
// ---------------------------------------------

depthImg.onload = () => {
  const tempC = document.createElement("canvas");
  const tctx = tempC.getContext("2d");

  depthW = depthImg.width;
  depthH = depthImg.height;

  tempC.width = depthW;
  tempC.height = depthH;

  tctx.drawImage(depthImg, 0, 0, depthW, depthH);

  const d = tctx.getImageData(0, 0, depthW, depthH);
  depthData = d.data;
  depthReady = true;
  tryStartRender();
};

// ---------------------------------------------
// 🔥 원본 배경 로드 후 실행
// ---------------------------------------------
bg.onload = () => {
  bgReady = true;
  tryStartRender();
};

function tryStartRender() {
  if (bgReady && depthReady) {
    startDepthParallax();
  }
}

// ---------------------------------------------
// 🔥 depth 기반 패럴랙스 렌더링
// ---------------------------------------------
function startDepthParallax() {

  let mx = 0, my = 0;
  const strength = 8;  // 이동 강도

    window.addEventListener("mousemove", (e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    mx = (e.clientX - cx) / cx;
    my = (e.clientY - cy) / cy;
  });

  function render() {
    if (!firstFrameRendered) {
    firstFrameRendered = true;

    // 로딩 제거
    loader.classList.add("hide");

    // 콘텐츠 등장
    document.querySelectorAll(".page, .glass-card, .tracklist-card, .comment-card")
      .forEach(el => el.classList.add("loaded"));
  }
    const w = renderCanvas.width;
    const h = renderCanvas.height;

    // 배경 확대
    const scale = 1.25;
    const iw = bg.width * scale;
    const ih = bg.height * scale;

    const ox = (w - iw) / 2;
    const oy = (h - ih) / 2;

    // 캔버스에 먼저 원본 그리기
    rctx.clearRect(0, 0, w, h);
    rctx.drawImage(bg, ox, oy, iw, ih);

    // 원본 픽셀 데이터 읽기
    const frame = rctx.getImageData(0, 0, w, h);
    const dst = frame.data;

    // 원본 보존본 생성 (중요!)
    const src = new Uint8ClampedArray(dst);

    // depth / 화면 사이즈 매핑 비율
    const rx = depthW / w;
    const ry = depthH / h;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {

        // depth 좌표 매핑
        const dx = (x * rx) | 0;
        const dy = (y * ry) | 0;

        // 0~1 depth
        const depthVal = depthData[(dy * depthW + dx) * 4] / 255;

        // 픽셀 이동량
        const shiftX = (mx * depthVal * strength) | 0;
        const shiftY = (my * depthVal * strength) | 0;

        const sx = x + shiftX;
        const sy = y + shiftY;

        if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;

        const srcIdx = (sy * w + sx) * 4;
        const dstIdx = (y * w + x) * 4;

        // 뒤틀림 방지: 반드시 src에서 읽어야 한다
        dst[dstIdx] = src[srcIdx];
        dst[dstIdx + 1] = src[srcIdx + 1];
        dst[dstIdx + 2] = src[srcIdx + 2];
      }
    }

    rctx.putImageData(frame, 0, 0);
    rctx.globalCompositeOperation = "screen";

    rctx.globalCompositeOperation = "source-over";

    requestAnimationFrame(render);
  }

  render();
}

const comments = {
  0: {
    title: "Solenyx - Tonarui",
    body: "정통 트랜스?에 가까운 느낌입니다. 앨범 취지에 맞게 주력으로 항상 만들던거라 어렵지 않게 완성은 했는데 듣기 지루하지 않을까 라는 생각이 듭니다.  다음엔 요즘 시대에 맞는 하이퍼트랜스라던가 재밌는 걸 주력으로 만들어 보겠습니다. 여러모로 아쉽지만 좋은 밑거름이 될 거 같네요! "
  },
  1: {
    title: "Revolve -  lisiko",
    body: "사실 장르 생각을 하지 않은채로 늘 쓰던 스타일로 썼어요. 사실 원래 쓰던 스타일이랑은 약간 다르긴 한데 듣는 데에는 대략 비슷하겠거니 싶고"
  },
  2: {
    title: "pluto - prsgt",
    body: "심플한 트랜스입니다. 많은 고민을 거치지 않은 것 치고는 꽤 마음에 들지도? 다만 다음번엔 더 많은 고민을 해 보는 걸로... 명왕성은 혼자 동떨어져 있다는 느낌이 있죠. 슬플 것 같네요. 제가 명왕성이라면 그냥 지구에 돌진해서 소멸했습니다. "
  },
  3: {
    title: "Open Portal - Tonarui",
    body: "처음으로 완곡해서 만들어본 하이테크에요! 앨범 이미지를 항상 생각해서 난잡하고 하이테크 특유의 재밌는 느낌을 많이 주려고 했어요. Output 사의 Portal도 사용해서 재미를 좀 봤습니다.(비싸다) 재밌게 들어주세요!"
  },
  4: {
    title: "Alertavoid - lisiko",
    body: "곡내림이 영원히 안와서 2025년과 전혀 관계없는 곡이 나왔어요"
  },
  5: {
    title: "ujumia - prsgt",
    body: "테크노입니다. 좋아하는 테크노들의 특징을 담아 최대한 멜로디를 배제하기도 하고, 미묘한 코드 진행을 하기도 했습니다... 만 어째선지 기묘한 곡이 되어버렸네요. 우주에서 부조리한 이유로 길을 잃은 느낌을 표현하고 싶었습니다. 우주미아네요. 모쪼록 잘 부탁드립니다. "
  }
};


document.querySelectorAll(".disc-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const disc = btn.dataset.disc;

    // 버튼 활성화
    document.querySelectorAll(".disc-btn")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // 패널 전환
    document.querySelectorAll(".disc-panel").forEach(panel => {
      panel.classList.add("hidden");
      if (panel.dataset.disc === disc) {
        panel.classList.remove("hidden");
      }
    });
  });
});

const discDescription = document.querySelector(".disc-description");

const descriptions = {
  1: "Disc 1은 작곡가가 가장 자신 있는 스타일,\n평소 즐겨 만드는 주력 장르로 구성되었습니다.",
  2: "Disc 2는 평소 즐겨 듣는 장르,\n만들어보고 싶었던 새로운 스타일로 구성되었습니다."
};

document.querySelectorAll(".disc-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const disc = btn.dataset.disc;
    discDescription.textContent = descriptions[disc];
  });
});

const navButtons = document.querySelectorAll(".nav-btn");
const slider = document.getElementById("slider");
const pages = slider.querySelectorAll(".page");

const totalPages = pages.length;

document.documentElement.style.setProperty("--page-count", totalPages);

let current = 0;


function go(index, animate = true) {
  if (index < 0) index = totalPages - 1;
  if (index >= totalPages) index = 0;

  current = index;

  slider.style.transition = animate
    ? "transform .55s cubic-bezier(.22,1.1,.36,1)"
    : "none";

  slider.style.transform =
    `translateX(-${current * window.innerWidth}px)`;

  buttons.forEach(b => b.classList.remove("active"));
  buttons[current].classList.add("active");
}




document.querySelector(".side-arrow.left").onclick = () => {
  go(current - 1);
};

document.querySelector(".side-arrow.right").onclick = () => {
  go(current + 1);
};


let startX = 0;
let currentX = 0;
let isDragging = false;

const viewport = document.getElementById("viewport");

function setSlider(x, withTransition = false) {
  slider.style.transition = withTransition
    ? "transform .55s cubic-bezier(.22,1.1,.36,1)"
    : "none";

  slider.style.transform = `translateX(${x}px)`;
}

const pageslide = document.querySelectorAll(".page");

viewport.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
  currentX = startX;
  isDragging = true;
  slider.style.transition = "none";
}, { passive: true });

viewport.addEventListener("touchmove", e => {
  if (!isDragging) return;

  currentX = e.touches[0].clientX;
  let delta = currentX - startX;


  const resistance = 0.85;
  delta *= resistance;

  
  const offset = -current * window.innerWidth + delta;
  setSlider(offset);
  pageslide.forEach(p => p.style.transform = "scale(0.98)");
}, { passive: true });


viewport.addEventListener("touchend", () => {
  if (!isDragging) return;
  isDragging = false;

  const delta = currentX - startX;
  const threshold = window.innerWidth * 0.2;

  
  if (delta > threshold) {
  go(current - 1);
} else if (delta < -threshold) {
  go(current + 1);
} else {
  go(current);
}

  pageslide.forEach(p => p.style.transform = "scale(1)");
});


// ================================
// EDGE SHARD SYSTEM 
// ================================
const shardCanvas = document.getElementById("cornerFxCanvas");
const sctx = shardCanvas.getContext("2d");

function resizeShard() {
  shardCanvas.width = innerWidth;
  shardCanvas.height = innerHeight;
}
resizeShard();
addEventListener("resize", resizeShard);
function drawWire(ctx, path, alpha) {
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  path.forEach((p, i) => {
    const x = p.x * innerWidth;
    const y = p.y * innerHeight;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}


function drawPulse(ctx, path, t, color) {
  const seg = Math.floor(t) % (path.length - 1);
  const p1 = path[seg];
  const p2 = path[seg + 1];

  const f = t % 1;

  const x = (p1.x + (p2.x - p1.x) * f) * innerWidth;
  const y = (p1.y + (p2.y - p1.y) * f) * innerHeight;

  const flash = Math.sin(t * 6) > 0.92 ? 1 : 0; // 순간 번쩍
  const alpha = flash ? 1 : 0.7;
  const size = flash ? 6 : 4;

  ctx.fillStyle = `rgba(${color},${alpha})`;
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
}



const circuits = [];
const bgCircuits = [];


function createCircuits() {
  circuits.length = 0;
  bgCircuits.length = 0;

  const edgeCount = 8;
  const gridStep = 0.04;
  const margin = 0.04;

  function snap(v) {
    return Math.round(v / gridStep) * gridStep;
  }

  function randomPath(startX, startY, depth = 4) {
    const path = [{ x: startX, y: startY }];
    let x = startX;
    let y = startY;

    const segments = depth + Math.floor(Math.random() * 2);

    for (let i = 0; i < segments; i++) {
      if (i % 2 === 0) {
        x += (Math.random() > 0.5 ? 1 : -1) * gridStep * 2;
        x = snap(x);
      } else {
        y += (Math.random() > 0.5 ? 1 : -1) * gridStep * 2;
        y = snap(y);
      }
      path.push({ x, y });
    }
    return path;
  }

  function addEdge(x, y) {
    bgCircuits.push({
      path: randomPath(x, y, 6),
      fadePhase: Math.random() * Math.PI * 2
    });

    circuits.push({
      path: randomPath(x, y, 4),
      energy: new Array(10).fill(0) // 세그먼트 에너지
    });
  }

  // 🔹 실제로 회로 생성
  for (let i = 0; i < edgeCount; i++) {
    const t = snap((i + 1) / (edgeCount + 1));

    addEdge(t, margin);         // top
    addEdge(1 - margin, t);     // right
    addEdge(t, 1 - margin);     // bottom
    addEdge(margin, t);         // left
  }
}

function addEdge(x, y) {
  bgCircuits.push({
    path: randomPath(x, y, 6),
    fadePhase: Math.random() * Math.PI * 2
  });

  circuits.push({
    path: randomPath(x, y, 4),
    fadePhase: Math.random() * Math.PI * 2
  });
}



createCircuits();

let t = 0;

function renderCircuits() {
  requestAnimationFrame(renderCircuits);
  sctx.clearRect(0, 0, shardCanvas.width, shardCanvas.height);

  circuits.forEach((c, i) => {
    const pulseT = t * 0.05 + i * 0.7;
    const seg = Math.floor(pulseT) % (c.path.length - 1);
    const f = pulseT % 1;

    // pulse 위치
    const p1 = c.path[seg];
    const p2 = c.path[seg + 1];

    const px = (p1.x + (p2.x - p1.x) * f) * innerWidth;
    const py = (p1.y + (p2.y - p1.y) * f) * innerHeight;

    // 🔹 모든 세그먼트 에너지 감쇠
    for (let j = 0; j < c.energy.length; j++) {

    // 기본 감쇠 (천천히)
    c.energy[j] *= 0.965;

    // 잔광 곡선 (pulse 지나간 뒤 서서히 사라짐)
    const trail = Math.max(0, Math.sin(c.energy[j] * Math.PI - 0.4)) * 0.015;

    c.energy[j] -= trail;

    if (c.energy[j] < 0.001) c.energy[j] = 0;
  }


    // 🔹 pulse가 가까운 세그먼트에 에너지 주입
    for (let j = 0; j < c.path.length - 1; j++) {
      const a = c.path[j];
      const b = c.path[j + 1];

      const x1 = a.x * innerWidth;
      const y1 = a.y * innerHeight;
      const x2 = b.x * innerWidth;
      const y2 = b.y * innerHeight;

      const d = distToSegment(px, py, x1, y1, x2, y2);

      if (d < 50) {
        c.energy[j] += (1 - c.energy[j]) * 0.35;
      }

    }

    // 🔹 에너지 기반 렌더
    for (let j = 0; j < c.path.length - 1; j++) {
      const e = c.energy[j];
      if (e < 0.02) continue;

      const a = c.path[j];
      const b = c.path[j + 1];

      const x1 = a.x * innerWidth;
      const y1 = a.y * innerHeight;
      const x2 = b.x * innerWidth;
      const y2 = b.y * innerHeight;

      const alpha = Math.pow(e, 1.3) * 0.22;

      sctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      sctx.lineWidth = 2;
      sctx.beginPath();
      sctx.moveTo(x1, y1);
      sctx.lineTo(x2, y2);
      sctx.stroke();
    }

    // pulse 자체
    drawPulse(
      sctx,
      c.path,
      pulseT,
      i % 2 ? "120,220,255" : "180,120,255"
    );
  });

  t++;
}



function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const cx = x1 + t * dx;
  const cy = y1 + t * dy;

  return Math.hypot(px - cx, py - cy);
}


renderCircuits();


const card = document.querySelector(".glass-card");

let phase = 0;
function breatheCard() {
  phase += 0.003;
  const v = Math.sin(phase) * 0.04 + 0.5;

  card.style.background = `
    linear-gradient(
      180deg,
      rgba(${60 + v*20}, ${40 + v*10}, ${90 + v*30}, 0.35),
      rgba(20, 20, 30, 0.45)
    )
  `;

  requestAnimationFrame(breatheCard);
}
breatheCard();

