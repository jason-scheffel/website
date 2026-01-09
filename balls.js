const canvas = document.getElementById('background');
const ctx = canvas.getContext('2d');
const container = document.querySelector('.container');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

let containerRect = null;

function updateContainerRect() {
  const rect = container.getBoundingClientRect();
  containerRect = {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom
  };
}

updateContainerRect();
window.addEventListener('resize', updateContainerRect);

function getContainerRect() {
  return containerRect;
}

// Spatial grid for collision optimization
const CELL_SIZE = 100;
let grid = {};

function getCellKey(x, y) {
  const cx = Math.floor(x / CELL_SIZE);
  const cy = Math.floor(y / CELL_SIZE);
  return `${cx},${cy}`;
}

function clearGrid() {
  grid = {};
}

function addToGrid(ball) {
  const key = getCellKey(ball.x, ball.y);
  if (!grid[key]) grid[key] = [];
  grid[key].push(ball);
}

function getNearbyBalls(ball) {
  const nearby = [];
  const cx = Math.floor(ball.x / CELL_SIZE);
  const cy = Math.floor(ball.y / CELL_SIZE);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${cx + dx},${cy + dy}`;
      if (grid[key]) nearby.push(...grid[key]);
    }
  }
  return nearby;
}

const MAX_SPLITS = 4;

class Ball {
  constructor(x, y, radius, vx, vy, color, generation = 0, immune = false) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.mass = radius * radius;
    this.generation = generation;
    this.immuneFrames = immune ? 30 : 0;
  }

  canSplit() {
    return this.generation < MAX_SPLITS && this.radius > 10 && this.immuneFrames === 0;
  }

  split() {
    const newRadius = this.radius * 0.8;
    const speed = Math.max(Math.sqrt(this.vx * this.vx + this.vy * this.vy), 1);
    const angle1 = Math.atan2(this.vy, this.vx) + Math.PI / 3;
    const angle2 = Math.atan2(this.vy, this.vx) - Math.PI / 3;

    return [
      new Ball(this.x - newRadius, this.y, newRadius, Math.cos(angle1) * speed, Math.sin(angle1) * speed, this.color, this.generation + 1, true),
      new Ball(this.x + newRadius, this.y, newRadius, Math.cos(angle2) * speed, Math.sin(angle2) * speed, this.color, this.generation + 1, true)
    ];
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }

  update() {
    // Decrease immunity
    if (this.immuneFrames > 0) this.immuneFrames--;

    // Wall collision
    if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
      this.vx = -this.vx;
    }
    if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
      this.vy = -this.vy;
    }

    // Container collision
    const box = getContainerRect();
    const nextX = this.x + this.vx;
    const nextY = this.y + this.vy;

    // Check if ball overlaps with container
    if (nextX + this.radius > box.left && nextX - this.radius < box.right &&
        nextY + this.radius > box.top && nextY - this.radius < box.bottom) {

      // Find which side we're hitting
      const overlapLeft = (this.x + this.radius) - box.left;
      const overlapRight = box.right - (this.x - this.radius);
      const overlapTop = (this.y + this.radius) - box.top;
      const overlapBottom = box.bottom - (this.y - this.radius);

      const minOverlapX = Math.min(Math.abs(overlapLeft), Math.abs(overlapRight));
      const minOverlapY = Math.min(Math.abs(overlapTop), Math.abs(overlapBottom));

      if (minOverlapX < minOverlapY) {
        this.vx = -this.vx;
        if (overlapLeft < overlapRight) {
          this.x = box.left - this.radius;
        } else {
          this.x = box.right + this.radius;
        }
      } else {
        this.vy = -this.vy;
        if (overlapTop < overlapBottom) {
          this.y = box.top - this.radius;
        } else {
          this.y = box.bottom + this.radius;
        }
      }
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

class Triangle {
  constructor(x, y, size, vx, vy) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
    this.rotation = 0;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(-this.size * 0.866, this.size * 0.5);
    ctx.lineTo(this.size * 0.866, this.size * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.restore();
  }

  update() {
    // Rotate slowly
    this.rotation += 0.01;

    // Wall collision
    if (this.x + this.size > canvas.width || this.x - this.size < 0) {
      this.vx = -this.vx;
    }
    if (this.y + this.size > canvas.height || this.y - this.size < 0) {
      this.vy = -this.vy;
    }

    // Container collision
    const box = getContainerRect();
    const nextX = this.x + this.vx;
    const nextY = this.y + this.vy;

    if (nextX + this.size > box.left && nextX - this.size < box.right &&
        nextY + this.size > box.top && nextY - this.size < box.bottom) {
      const overlapLeft = (this.x + this.size) - box.left;
      const overlapRight = box.right - (this.x - this.size);
      const overlapTop = (this.y + this.size) - box.top;
      const overlapBottom = box.bottom - (this.y - this.size);

      const minOverlapX = Math.min(Math.abs(overlapLeft), Math.abs(overlapRight));
      const minOverlapY = Math.min(Math.abs(overlapTop), Math.abs(overlapBottom));

      if (minOverlapX < minOverlapY) {
        this.vx = -this.vx;
      } else {
        this.vy = -this.vy;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  collidesWith(ball) {
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.size + ball.radius;
  }

  bounceOff(ball) {
    const dx = this.x - ball.x;
    const dy = this.y - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / distance;
    const ny = dy / distance;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.vx = nx * speed;
    this.vy = ny * speed;
  }
}

// Create balls with random sizes and speeds
const balls = [];
const colors = ['#ddd', '#ccc', '#bbb', '#aaa'];
const numBalls = 8;

function isInsideContainer(x, y, radius) {
  const box = getContainerRect();
  return x + radius > box.left && x - radius < box.right &&
         y + radius > box.top && y - radius < box.bottom;
}

for (let i = 0; i < numBalls; i++) {
  const radius = Math.random() * 40 + 30;
  let x, y;
  do {
    x = Math.random() * (canvas.width - radius * 2) + radius;
    y = Math.random() * (canvas.height - radius * 2) + radius;
  } while (isInsideContainer(x, y, radius));
  const vx = (Math.random() - 0.5) * 1.5;
  const vy = (Math.random() - 0.5) * 1.5;
  const color = colors[Math.floor(Math.random() * colors.length)];

  balls.push(new Ball(x, y, radius, vx, vy, color));
}

// Create the triangle
let triangleX, triangleY;
const triangleSize = 25;
do {
  triangleX = Math.random() * (canvas.width - triangleSize * 2) + triangleSize;
  triangleY = Math.random() * (canvas.height - triangleSize * 2) + triangleSize;
} while (isInsideContainer(triangleX, triangleY, triangleSize));
const triangle = new Triangle(triangleX, triangleY, triangleSize, 1, 1);

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update and draw triangle
  triangle.update();
  triangle.draw();

  // Check triangle collisions with balls and split them
  const ballsToAdd = [];
  const ballsToRemove = [];

  for (let i = 0; i < balls.length; i++) {
    if (triangle.collidesWith(balls[i])) {
      triangle.bounceOff(balls[i]);
      if (balls[i].canSplit()) {
        ballsToRemove.push(i);
        ballsToAdd.push(...balls[i].split());
      }
    }
  }

  // Remove split balls (in reverse order to preserve indices)
  for (let i = ballsToRemove.length - 1; i >= 0; i--) {
    balls.splice(ballsToRemove[i], 1);
  }

  // Add new balls
  balls.push(...ballsToAdd);

  // Update all balls and build spatial grid
  clearGrid();
  for (let i = 0; i < balls.length; i++) {
    balls[i].update();
    addToGrid(balls[i]);
  }

  // Check collisions using spatial grid
  const checked = new WeakSet();
  for (const ball of balls) {
    const nearby = getNearbyBalls(ball);
    for (const other of nearby) {
      if (ball === other || checked.has(other)) continue;
      checkCollision(ball, other);
    }
    checked.add(ball);
  }

  // Draw all balls
  for (let i = 0; i < balls.length; i++) {
    balls[i].draw();
  }

  requestAnimationFrame(animate);
}

animate();
