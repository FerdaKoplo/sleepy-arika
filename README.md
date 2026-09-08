# She was sleeping, i need to wake her up 

A high-performance backend architecture experiment comparing traditional synchronous database writes against a RAM-based **write-behind memory cluster**. 

This repository demonstrates how shifting active user state into memory before lazily syncing it to a database can eliminate disk I/O bottlenecks and drastically reduce latency spikes under heavy load.

---

## The Struggle : Waking Up Arika

Arika is a hardworking, but chronically sleepy student. When tasked with logging massive amounts of user traffic, her default method was to write every single action down in her heavy, slow physical notebook (MySQL Disk I/O). Under the pressure of 12,000 continuous requests, she started falling asleep at her desk, leading to massive 220ms lag spikes.

As her instructor, I had to find a way to wake her up. 

<p align="center">
  <img src="./assets/arika.png" width="250" alt="Sleepy Arika (220ms latency)">
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./assets/arika-pouty.png" width="250" alt="Overclocked Arika (2ms latency)">
</p>

By taking away her physical notebook and forcing her to hold active data directly in her short-term memory (RAM), Arika became entirely immune to disk fatigue. She might be pouting about the strict new workflow, but with a background worker quietly handling the database syncs for her, she easily handles 100 concurrent users with a flawless 2ms response time.

---

## Architecture

The project is split into two distinct API routes to test performance side-by-side:

### 1. Sleepy Arika (`/api/unclustered`)
The conventional approach. Every incoming request waits for a `prisma.$transaction` to hit the MySQL disk and confirm the write before responding to the user.
* **Stack:** Express -> Prisma MariaDB Adapter -> MySQL through docker 

### 2. Awake Arika (`/api/clustered`)
The write-behind cluster. Requests interact exclusively with RAM.
* **`pockets/`**: Active user state is held in a strongly-typed TypeScript `Map()` for instant, zero-latency `O(1)` reads and writes.
* **`sleeves/`**: A background worker asynchronously flushes "dirty" memory blocks to the MySQL database on a set interval.

### The Background Worker (`flushPendingSyncs`)
Instead of saving data during a frantic API request, the worker runs quietly on a 10-second timer:
1. **Checks the To-Do List:** Looks at `pendingSyncs` to see if any user profiles were modified.
2. **Gathers the Data:** Temporarily clears the list and reaches into Arika's pockets to grab the latest state.
3. **The Big Batch Save:** Bundles all updates into a single, highly efficient `prisma.$transaction` and saves them to MySQL all at once.
4. **The Failsafe:** If the database goes offline, the worker catches the error, puts everyone back on the to-do list, and simply tries again 10 seconds later.

---

## Load Testing & Benchmarks

The APIs were stress-tested using Postman's Collection Runner to simulate a high-traffic environment. 

**Methodology:**
* **Concurrency:** 100 Virtual Users
* **Duration:** 2 Minutes sustained load
* **Payload:** Simple user profile updates (incrementing `actionsLogged`)

### The Results

<p align="center">
  <img src="./assets/results/unclustered_result.png" width="45%" alt="Standard API Postman Results">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./assets/results/clustered_result.png" width="45%" alt="Overclocked API Postman Results">
</p>

| Performance Metric | Sleepy Arika (Direct DB) | Awake Arika (Memory Cluster) |
| :--- | :--- | :--- |
| **Total Requests** | 12,134 | **12,464** |
| **Average Response**| 13 ms | **2 ms** |
| **P95 (95% of traffic)** | 20 ms | **3 ms** |
| **P99 (Worst 1%)** | 220 ms | **9 ms** |

### Key Takeaways
* **Eliminated the Bottleneck:** Under sustained pressure, the traditional connection pool choked on the top 1% of requests, queuing for up to 220ms. The memory cluster absorbed the same pressure in just 9ms.
* **The Worker "Blip":** A microscopic fraction of clustered requests hit a max response time of 185ms. This represents the exact 10-second interval where the background worker briefly utilizes the event loop to execute the bulk database transaction, proving the sync operates without crippling the main thread.

---

## Your Turn to Wake Her Up 

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Database**
   Spin up the MySQL container using Docker Compose:

   ```bash
   docker compose up -d
   ```

3. **Configure the Environment**
   Generate the Prisma Client and push the table structure to MySQL:

   ```bash
   DATABASE_URL="mysql://admin:password@127.0.0.1:3306/arika-db"
   ```

4. **Push the Schema**
   Generate the Prisma Client and push the table structure to MySQL:
   ```bash 
   npx prisma db push
   ```

5. **Run the Server** 
   Start the development server (runs on port 3005):

   ```bash
   npm run dev
   ```
