const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- ELEMEN MENU ---
const mainMenu = document.getElementById("main-menu");
const startBtn = document.getElementById("start-btn");
const skinBtns = document.querySelectorAll(".skin-btn");

// --- VARIABEL GAMBAR (ASET) ---
const birdImg = new Image();
birdImg.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Milo"; 

const pipeImg = new Image();
pipeImg.src = "https://placehold.co/50x600/2ecc71/2ecc71.png"; 

// --- VARIABEL GAME ---
let bird = { x: 50, y: 200, width: 40, height: 40, velocity: 0, gravity: 0.5, lift: -8 };
let pipes = []; 
const pipeWidth = 50; 
const pipeGap = 150;  

// --- VARIABEL PROGRESIF (BARU) ---
let score = 0;          
let survivalTime = 0;         // Waktu bermain dalam detik
let gameSpeed = 3;            // Kecepatan awal
const basePipeDistance = 250; // Jarak horizontal antar pipa selalu konsisten
let distanceToNextPipe = 0;   // Penghitung mundur jarak untuk memunculkan pipa baru

let isGameOver = false; 
let isGameRunning = false; 

// --- LOGIKA GANTI SKIN ---
skinBtns.forEach(btn => {
    btn.addEventListener("click", function() {
        skinBtns.forEach(b => b.classList.remove("selected"));
        this.classList.add("selected");
        birdImg.src = this.src; 
    });
});

// --- TOMBOL MULAI MAIN ---
startBtn.addEventListener("click", function() {
    mainMenu.style.display = "none"; 
    isGameRunning = true;            
    resetGame();                     
});

// --- FUNGSI MENGGAMBAR ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isGameRunning) return;

    // Menggambar Rintangan
    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        ctx.drawImage(pipeImg, p.x, p.topHeight - 600, pipeWidth, 600); 
        ctx.drawImage(pipeImg, p.x, canvas.height - p.bottomHeight, pipeWidth, 600);
    }

    // Menggambar Karakter
    ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    // Menggambar UI (Skor & Waktu)
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 5;
    
    // Teks Skor
    ctx.font = "bold 30px Arial";
    ctx.fillText("Skor: " + score, 20, 40);
    
    // Teks Waktu (BARU)
    ctx.font = "bold 20px Arial";
    ctx.fillText("Waktu: " + Math.floor(survivalTime) + "s", 20, 70);
    
    ctx.shadowBlur = 0; // Matikan bayangan agar tidak bocor ke elemen lain

    // Tampilan Game Over
    if (isGameOver) {
        ctx.fillStyle = "red";
        ctx.font = "bold 50px Arial";
        ctx.shadowBlur = 5;
        ctx.fillText("GAME OVER", 40, canvas.height / 2 - 20);
        
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.shadowBlur = 5;
        ctx.fillText("Klik untuk main lagi!", 110, canvas.height / 2 + 20);
        
        // Tampilkan hasil akhir
        ctx.fillStyle = "yellow";
        ctx.fillText("Bertahan: " + Math.floor(survivalTime) + " detik | Skor: " + score, 65, canvas.height / 2 + 60);
        ctx.shadowBlur = 0;
    }
}

// --- FUNGSI LOGIKA (DIPERBARUI) ---
function update() {
    if (!isGameRunning || isGameOver) return; 

    // UPDATE WAKTU & KECEPATAN (BARU)
    // Satu detik kira-kira 60 frame (1/60), jadi kita tambahkan seiring waktu
    survivalTime += 1 / 60; 
    
    // Kecepatan bertambah secara bertahap seiring bertambahnya waktu
    // Dari awal 3, perlahan naik menjadi 4, 5, dst.
    gameSpeed = 3 + (survivalTime * 0.05); 

    // Logika gravitasi
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Batas layar atas dan bawah
    if (bird.y + bird.height >= canvas.height) {
        bird.y = canvas.height - bird.height;
        isGameOver = true;
    }
    if (bird.y <= 0) { bird.y = 0; bird.velocity = 0; }

    // LOGIKA PENCIPTAAN RINTANGAN BERBASIS JARAK (BARU)
    // Jarak yang sudah ditempuh dikurangi sebesar kecepatan game
    distanceToNextPipe -= gameSpeed;
    
    // Jika sudah menempuh jarak tertentu (distance <= 0), buat pipa baru!
    if (distanceToNextPipe <= 0) {
        let topHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
        let bottomHeight = canvas.height - topHeight - pipeGap;
        pipes.push({ x: canvas.width, topHeight: topHeight, bottomHeight: bottomHeight, passed: false });
        
        // Reset kembali penghitung jaraknya
        distanceToNextPipe = basePipeDistance;
    }

    // Menggerakkan rintangan dan Cek Tabrakan
    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        
        // Kecepatannya tidak statis lagi, melainkan mengikuti gameSpeed
        p.x -= gameSpeed; 

        // Deteksi menabrak pipa
        if (bird.x < p.x + pipeWidth && bird.x + bird.width > p.x && 
           (bird.y < p.topHeight || bird.y + bird.height > canvas.height - p.bottomHeight)) {
            isGameOver = true; 
        }

        // Tambah skor jika lewat
        if (p.x + pipeWidth < bird.x && !p.passed) {
            score++;
            p.passed = true;
        }
    }

    // Bersihkan memori dari pipa yang sudah lewat layar
    if (pipes.length > 0 && pipes[0].x + pipeWidth < 0) {
        pipes.shift(); 
    }
}

// --- FUNGSI KONTROL ---
function jump() {
    if (!isGameRunning) return; 

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
    
    // Reset parameter dinamis
    survivalTime = 0;
    gameSpeed = 3;
    distanceToNextPipe = 0; // 0 agar pipa langsung muncul saat game mulai
    
    isGameOver = false;
}

// Event Listener Keyboard & Mouse
window.addEventListener("keydown", function(e) {
    if(e.code === "Space" && e.target == document.body) {
      e.preventDefault();
    }
});

window.addEventListener("mousedown", jump);
window.addEventListener("keydown", function(event) {
    if (event.code === "Space") { jump(); }
});

// --- GAME LOOP ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop); 
}

gameLoop();