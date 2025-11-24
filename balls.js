const canvas = document.getElementById('background');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

class Ball {
  constructor(x, y, radius, vx, vy, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.mass = radius * radius;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }

  update() {
    // Wall collision
    if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
      this.vx = -this.vx;
    }
    if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
      this.vy = -this.vy;
    }

    this.x += this.vx;
    this.y += this.vy;
  }
}

function checkCollision(ball1, ball2) {
  const dx = ball2.x - ball1.x;
  const dy = ball2.y - ball1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < ball1.radius + ball2.radius) {
    // Collision detected - elastic collision physics
    const angle = Math.atan2(dy, dx);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    // Rotate ball1's position
    const pos1 = { x: 0, y: 0 };
    const pos2 = rotate(dx, dy, sin, cos, true);

    // Rotate ball1's velocity
    const vel1 = rotate(ball1.vx, ball1.vy, sin, cos, true);
    const vel2 = rotate(ball2.vx, ball2.vy, sin, cos, true);

    // Collision reaction
    const vxTotal = vel1.x - vel2.x;
    vel1.x = ((ball1.mass - ball2.mass) * vel1.x + 2 * ball2.mass * vel2.x) / (ball1.mass + ball2.mass);
    vel2.x = vxTotal + vel1.x;

    // Update positions to avoid overlap
    const absV = Math.abs(vel1.x) + Math.abs(vel2.x);
    const overlap = (ball1.radius + ball2.radius) - Math.abs(pos1.x - pos2.x);
    pos1.x += vel1.x / absV * overlap;
    pos2.x += vel2.x / absV * overlap;

    // Rotate positions back
    const pos1F = rotate(pos1.x, pos1.y, sin, cos, false);
    const pos2F = rotate(pos2.x, pos2.y, sin, cos, false);

    // Adjust positions
    ball2.x = ball1.x + pos2F.x;
    ball2.y = ball1.y + pos2F.y;
    ball1.x = ball1.x + pos1F.x;
    ball1.y = ball1.y + pos1F.y;

    // Rotate velocities back
    const vel1F = rotate(vel1.x, vel1.y, sin, cos, false);
    const vel2F = rotate(vel2.x, vel2.y, sin, cos, false);

    ball1.vx = vel1F.x;
    ball1.vy = vel1F.y;
    ball2.vx = vel2F.x;
    ball2.vy = vel2F.y;
  }
}

function rotate(x, y, sin, cos, reverse) {
  return {
    x: reverse ? (x * cos + y * sin) : (x * cos - y * sin),
    y: reverse ? (y * cos - x * sin) : (y * cos + x * sin)
  };
}

// Create balls with random sizes and speeds
const balls = [];
const colors = ['#ddd', '#ccc', '#bbb', '#aaa'];
const numBalls = 8;

for (let i = 0; i < numBalls; i++) {
  const radius = Math.random() * 30 + 15;
  const x = Math.random() * (canvas.width - radius * 2) + radius;
  const y = Math.random() * (canvas.height - radius * 2) + radius;
  const vx = (Math.random() - 0.5) * 3;
  const vy = (Math.random() - 0.5) * 3;
  const color = colors[Math.floor(Math.random() * colors.length)];

  balls.push(new Ball(x, y, radius, vx, vy, color));
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < balls.length; i++) {
    balls[i].update();
    balls[i].draw();

    // Check collision with other balls
    for (let j = i + 1; j < balls.length; j++) {
      checkCollision(balls[i], balls[j]);
    }
  }

  requestAnimationFrame(animate);
}

animate();
