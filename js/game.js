const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- ELEMEN MENU ---
const mainMenu = document.getElementById("main-menu");
const startBtn = document.getElementById("start-btn");
const skinBtns = document.querySelectorAll(".skin-btn");

// --- VARIABEL GAMBAR (ASET) ---
const birdImg = new Image();
// Default skin sebelum memilih
birdImg.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Milo"; 

const pipeImg = new Image();
// Gambar sementara untuk pipa
pipeImg.src = "https://placehold.co/50x600/2ecc71/2ecc71.png"; 

// --- VARIABEL GAME ---
let bird = { x: 50, y: 200, width: 40, height: 40, velocity: 0, gravity: 0.5, lift: -8 };
let pipes = []; 
const pipeWidth = 50; 
const pipeGap = 150;  
let frameCount = 0;   
let score = 0;          
let isGameOver = false; 
let isGameRunning = false; // Status baru: Apakah game sedang dimainkan?

// --- LOGIKA GANTI SKIN ---
skinBtns.forEach(btn => {
    btn.addEventListener("click", function() {
        // Hilangkan efek 'selected' dari semua tombol
        skinBtns.forEach(b => b.classList.remove("selected"));
        // Tambahkan efek 'selected' ke tombol yang diklik
        this.classList.add("selected");
        // Ubah sumber gambar karakter utama sesuai tombol yang diklik
        birdImg.src = this.src; 
    });
});

// --- TOMBOL MULAI MAIN ---
startBtn.addEventListener("click", function() {
    mainMenu.style.display = "none"; // Sembunyikan menu
    isGameRunning = true;            // Tandai game dimulai
    resetGame();                     // Pastikan variabel bersih
});

// --- FUNGSI MENGGAMBAR ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Jika game belum jalan, cukup gambar awan/background statis (opsional, kita kosongkan dulu)
    if (!isGameRunning) return;

    // Menggambar Rintangan (Sekarang pakai gambar, bukan kotak warna)
    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        // Gambar pipa atas (dibalik jika kamu punya gambar pipa asli)
        ctx.drawImage(pipeImg, p.x, p.topHeight - 600, pipeWidth, 600); // 600 adalah tinggi asli gambar placeholder
        // Gambar pipa bawah
        ctx.drawImage(pipeImg, p.x, canvas.height - p.bottomHeight, pipeWidth, 600);
    }

    // Menggambar Karakter (Pakai gambar skin yang dipilih)
    ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    // Menggambar Skor
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 5;
    ctx.fillText("Skor: " + score, 20, 40);
    ctx.shadowBlur = 0; // Matikan bayangan untuk teks lain

    // Tampilan Game Over
    if (isGameOver) {
        ctx.fillStyle = "red";
        ctx.font = "bold 50px Arial";
        ctx.shadowBlur = 5;
        ctx.fillText("GAME OVER", 40, canvas.height / 2);
        
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.shadowBlur = 5;
        ctx.fillText("Klik untuk main lagi!", 110, canvas.height / 2 + 40);
        ctx.shadowBlur = 0;
    }
}

// --- FUNGSI LOGIKA (Tetap sama seperti sebelumnya) ---
function update() {
    if (!isGameRunning || isGameOver) return; // Jangan jalankan logika jika belum main

    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    if (bird.y + bird.height >= canvas.height) {
        bird.y = canvas.height - bird.height;
        isGameOver = true;
    }
    if (bird.y <= 0) { bird.y = 0; bird.velocity = 0; }

    frameCount++;
    if (frameCount % 100 === 0) {
        let topHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
        let bottomHeight = canvas.height - topHeight - pipeGap;
        pipes.push({ x: canvas.width, topHeight: topHeight, bottomHeight: bottomHeight, passed: false });
    }

    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        p.x -= 3; 

        if (bird.x < p.x + pipeWidth && bird.x + bird.width > p.x && 
           (bird.y < p.topHeight || bird.y + bird.height > canvas.height - p.bottomHeight)) {
            isGameOver = true; 
        }

        if (p.x + pipeWidth < bird.x && !p.passed) {
            score++;
            p.passed = true;
        }
    }

    if (pipes.length > 0 && pipes[0].x + pipeWidth < 0) {
        pipes.shift(); 
    }
}

function jump() {
    if (!isGameRunning) return; // Jangan bisa lompat kalau menu masih buka

    if (isGameOver) {
        resetGame();
    } else {
        bird.velocity = bird.lift;
    }
}

function resetGame() {
    bird.y = 200;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    frameCount = 0;
    isGameOver = false;
}

// Mencegah spasi menggulung layar ke bawah di browser
window.addEventListener("keydown", function(e) {
    if(e.code === "Space" && e.target == document.body) {
      e.preventDefault();
    }
});

// Kontrol
window.addEventListener("mousedown", jump);
window.addEventListener("keydown", function(event) {
    if (event.code === "Space") { jump(); }
});

// Loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop); 
}

gameLoop();