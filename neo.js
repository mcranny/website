let missionPayload = {
  mode: "loading",
  counts: { asteroids: 0, close_approaches: 0, intercept_plans: 0 },
  objects: []
};

const PLANET_NAMES = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
const PLANET_SIZES = { Mercury: 2.5, Venus: 3, Earth: 3.5, Mars: 3, Jupiter: 4.5, Saturn: 4, Uranus: 3.8, Neptune: 3.8 };

const state = {
  selectedIds: new Set(),
  time: 0,
  rotation: -18,
  tilt: 0,
  zoom: 105,
  panX: 0,
  panY: 0,
  cameraX: 0,
  cameraY: 0,
  cameraZ: 0,
  speed: 10,
  repeat: true,
  inspectedObject: "Target",
  playing: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  lastFrame: 0,
  drag: null,
  movedDuringDrag: false
};

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
}

function initTheme() {
  const stored = localStorage.getItem("theme");
  if (stored) setTheme(stored);
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  });
}

function drawViewer(canvas, mini = false) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.round(rect.width || canvas.width));
  const height = Math.max(240, Math.round(width * (mini ? 0.55 : 0.67)));

  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const styles = getComputedStyle(document.documentElement);
  const paper = styles.getPropertyValue("--paper").trim();
  const ink = styles.getPropertyValue("--ink").trim();
  const steel = styles.getPropertyValue("--steel").trim();
  const signal = styles.getPropertyValue("--signal").trim();
  const rule = styles.getPropertyValue("--rule").trim();
  const vizEarth = "#2196F3";
  const vizAsteroid = "#FF6B35";
  const vizTransfer = "#00C851";
  const vizSun = "#F5A623";
  const center = { x: width / 2 + (mini ? 0 : state.panX), y: height / 2 + (mini ? 0 : state.panY) };
  const sunScreenX = center.x;
  const sunScreenY = center.y;
  const scale = (Math.min(width, height) / 4.2) * (state.zoom / 100);
  const rotation = (state.rotation * Math.PI) / 180;
  const tilt = (state.tilt * Math.PI) / 180;
  const hitTargets = [];

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);

  function project(point) {
    const px = point.x - (mini ? 0 : state.cameraX);
    const py = point.y - (mini ? 0 : state.cameraY);
    const pz = (point.z || 0) - (mini ? 0 : state.cameraZ);
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const x1 = px * cosR - py * sinR;
    const y1 = px * sinR + py * cosR;
    const z1 = pz;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const y2 = y1 * cosT - z1 * sinT;
    return { x: sunScreenX + x1 * scale, y: sunScreenY + y2 * scale };
  }

  const orbitLimit = mini ? 2 : 31;
  ctx.strokeStyle = rule;
  ctx.lineWidth = 1;

  const sun = project({ x: 0, y: 0, z: 0 });
  if (!mini) {
    ctx.fillStyle = vizSun;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = mini ? rule : "rgba(61, 61, 64, 0.16)";
  ctx.lineWidth = 1;
  if (mini) {
    for (let au = 0.5; au <= orbitLimit; au += 0.5) {
      const samples = 144;
      ctx.beginPath();
      for (let i = 0; i <= samples; i += 1) {
        const angle = (i / samples) * Math.PI * 2;
        const point = project({ x: Math.cos(angle) * au, y: Math.sin(angle) * au, z: 0 });
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }
  } else {
    const gridLimit = 34;
    const gridStep = 1;
    for (let line = -gridLimit; line <= gridLimit; line += gridStep) {
      const left = project({ x: -gridLimit, y: line, z: 0 });
      const right = project({ x: gridLimit, y: line, z: 0 });
      const bottom = project({ x: line, y: -gridLimit, z: 0 });
      const top = project({ x: line, y: gridLimit, z: 0 });
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bottom.x, bottom.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(61, 61, 64, 0.24)";
    ctx.beginPath();
    const xStart = project({ x: -gridLimit, y: 0, z: 0 });
    const xEnd = project({ x: gridLimit, y: 0, z: 0 });
    ctx.moveTo(xStart.x, xStart.y);
    ctx.lineTo(xEnd.x, xEnd.y);
    ctx.stroke();
    ctx.beginPath();
    const yStart = project({ x: 0, y: -gridLimit, z: 0 });
    const yEnd = project({ x: 0, y: gridLimit, z: 0 });
    ctx.moveTo(yStart.x, yStart.y);
    ctx.lineTo(yEnd.x, yEnd.y);
    ctx.stroke();
  }

  const primary = primaryMission();
  PLANET_NAMES.forEach((planetName) => {
    const orbit = primary?.planet_orbits_au?.[planetName] || [];
    if (!orbit.length) return;
    ctx.strokeStyle = planetName === "Earth" ? (mini ? ink : vizEarth) : rule;
    ctx.lineWidth = planetName === "Earth" ? 1.5 : 1;
    ctx.beginPath();
    orbit.forEach((point, pointIndex) => {
      const p = project({ x: point[0], y: point[1], z: point[2] || 0 });
      if (pointIndex === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
  });

  const planetHitRadius = mini ? 0 : 12;
  PLANET_NAMES.forEach((planetName) => {
    const point = missionTrackPoint(primary, "planet_tracks_au", planetName);
    const planetPosition = project({ x: point[0], y: point[1], z: point[2] || 0 });
    ctx.fillStyle = planetName === "Earth" ? (mini ? ink : vizEarth) : steel;
    ctx.beginPath();
    ctx.arc(planetPosition.x, planetPosition.y, mini ? 2.5 : PLANET_SIZES[planetName], 0, Math.PI * 2);
    ctx.fill();
    if (!mini) hitTargets.push({ type: "inspect", object: planetName, x: planetPosition.x, y: planetPosition.y, radius: planetHitRadius });
  });

  const earthPoint = missionTrackPoint(primary, "planet_tracks_au", "Earth");
  const earth = project({ x: earthPoint[0], y: earthPoint[1], z: earthPoint[2] || 0 });
  ctx.fillStyle = mini ? ink : vizEarth;
  ctx.beginPath();
  ctx.arc(earth.x, earth.y, mini ? 4 : 5, 0, Math.PI * 2);
  ctx.fill();
  if (!mini) hitTargets.push({ type: "inspect", object: "Earth", x: earth.x, y: earth.y, radius: 14 });

  const selected = missionPayload.objects.filter((object) => state.selectedIds.has(object.designation));
  selected.forEach((object, index) => {
    ctx.strokeStyle = mini ? (index === 0 ? signal : steel) : vizAsteroid;
    ctx.lineWidth = mini ? (index === 0 ? 2 : 1.2) : 1.5;
    const targetTrack = object.target_orbit_au || object.target_track_au || [];
    if (targetTrack.length) {
      ctx.beginPath();
      targetTrack.forEach((point, pointIndex) => {
        const p = project({ x: point[0], y: point[1], z: point[2] || 0 });
        if (pointIndex === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    const targetPoint = missionTrackPoint(object, "target_track_au");
    const pos = project({ x: targetPoint[0], y: targetPoint[1], z: targetPoint[2] || 0 });
    ctx.fillStyle = mini ? (index === 0 ? signal : steel) : vizAsteroid;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, mini ? 3.5 : 5, 0, Math.PI * 2);
    ctx.fill();
    if (!mini) hitTargets.push({ type: "mission", id: object.designation, object: "Target", x: pos.x, y: pos.y, radius: 16 });

    if (!mini && object.polyline_au?.length) {
      ctx.strokeStyle = mini ? (index === 0 ? signal : steel) : vizTransfer;
      ctx.lineWidth = mini ? (index === 0 ? 3 : 1.6) : 2.5;
      ctx.beginPath();
      object.polyline_au.forEach((point, pointIndex) => {
        const p = project({ x: point[0], y: point[1], z: point[2] || 0 });
        if (pointIndex === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      const progress = Math.min(1, state.time / Math.max(1, object.tof_days || 1));
      const transferIndex = Math.min(
        object.polyline_au.length - 1,
        Math.round(progress * (object.polyline_au.length - 1))
      );
      const craftPoint = object.polyline_au[transferIndex];
      const craft = project({ x: craftPoint[0], y: craftPoint[1], z: craftPoint[2] || 0 });
      ctx.fillStyle = vizTransfer;
      ctx.beginPath();
      ctx.arc(craft.x, craft.y, 4, 0, Math.PI * 2);
      ctx.fill();
      hitTargets.push({ type: "inspect", object: "Spacecraft", x: craft.x, y: craft.y, radius: 14 });
    }

    if (!mini) {
      ctx.fillStyle = vizAsteroid;
      ctx.font = "12px IBM Plex Mono, SFMono-Regular, monospace";
      ctx.fillText(object.designation, pos.x + 8, pos.y - 8);
    }
  });

  ctx.fillStyle = steel;
  ctx.font = "11px IBM Plex Mono, SFMono-Regular, monospace";
  ctx.fillText(`${missionPayload.mode} / SQLite export / Lambert path`, 12, height - 14);
  if (!mini) {
    hitTargets.push({ type: "inspect", object: "Sun", x: sun.x, y: sun.y, radius: 18 });
    canvas.__neoHitTargets = hitTargets;
  }
}

function primaryMission() {
  return missionPayload.objects.find((object) => state.selectedIds.has(object.designation)) || missionPayload.objects[0];
}

function updateMetrics() {
  const primary = primaryMission();
  const name = document.querySelector("[data-selected-name]");
  const kind = document.querySelector("[data-selected-kind]");
  const summary = document.querySelector("[data-selected-summary]");
  const metrics = document.querySelector("[data-orbit-metrics]");
  const label = document.querySelector("[data-sim-label]");

  if (!primary) return;
  if (name) name.textContent = primary.designation;
  if (kind) kind.textContent = `${primary.close_approach_text} / ${formatNumber(primary.total_dv_kms, 2)} km/s dv`;
  if (summary) summary.textContent = `${formatNumber(primary.distance_au, 5)} AU miss / ${formatNumber(primary.tof_days, 0)} d TOF`;
  if (label) label.textContent = `Epoch + ${Math.round(state.time)} d`;
  if (!metrics) return;

  const rows = [
    ["Approach", primary.close_approach_text],
    ["Miss distance", `${formatNumber(primary.distance_au, 6)} AU`],
    ["Relative speed", `${formatNumber(primary.relative_velocity_kms, 2)} km/s`],
    ["Time of flight", `${formatNumber(primary.tof_days, 0)} d`],
    ["Total dv", `${formatNumber(primary.total_dv_kms, 3)} km/s`],
    ["C3", `${formatNumber(primary.c3_km2_s2, 3)} km2/s2`],
    ["LEO departure", `${formatNumber(primary.leo_departure_dv_kms, 3)} km/s`],
    ["Semi-major axis", `${formatNumber(primary.semi_major_axis_au, 4)} AU`],
    ["Eccentricity", formatNumber(primary.eccentricity, 4)],
    ["Inclination", `${formatNumber(primary.inclination_deg, 3)} deg`],
    ["Orbit condition", primary.condition_code || "n/a"],
    ["Polyline samples", `${primary.polyline_au?.length || 0} from Lambert export`]
  ];

  metrics.innerHTML = rows.map(([labelText, value]) => (
    `<div class="metric"><span>${labelText}</span><code>${value}</code></div>`
  )).join("");
  updateMissionTimeline(primary);
  updateInspector();
}

function renderObjectList() {
  const list = document.querySelector("[data-object-list]");
  const search = document.querySelector("#neo-search");
  if (!list) return;

  const query = (search?.value || "").toLowerCase();
  const matches = missionPayload.objects.filter((object) => `${object.designation} ${object.fullname} ${object.close_approach_text}`.toLowerCase().includes(query));
  list.innerHTML = matches.map((object) => `
    <button class="object-button" type="button" role="option" data-object-id="${object.designation}" aria-selected="${state.selectedIds.has(object.designation)}">
      <strong>${object.designation}</strong>
      <small>${object.close_approach_text} / dv=${formatNumber(object.total_dv_kms, 2)} km/s / miss=${formatNumber(object.distance_au, 5)} AU</small>
    </button>
  `).join("");

  list.querySelectorAll("[data-object-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.objectId;
      state.selectedIds.clear();
      state.selectedIds.add(id);
      state.time = 0;
      const time = document.querySelector("[data-time-scrub]");
      if (time) time.value = "0";
      applyCameraPreset("mission");
      renderObjectList();
      updateMetrics();
      drawAllViewers();
    });
  });
}

function drawAllViewers() {
  document.querySelectorAll("#neo-canvas").forEach((canvas) => {
    drawViewer(canvas, canvas.hasAttribute("data-mini-viewer"));
  });
}

function formatNumber(value, digits) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "n/a";
  return Number(value).toFixed(digits);
}

function updateMissionTimeline(primary = primaryMission()) {
  const time = document.querySelector("[data-time-scrub]");
  if (!time || !primary) return;
  const max = Math.max(1, Math.ceil(primary.tof_days || 180));
  time.max = String(max);
  if (state.time > max) {
    state.time = max;
    time.value = String(max);
  }
}

function missionProgress(primary = primaryMission()) {
  if (!primary) return 0;
  return Math.min(1, Math.max(0, state.time / Math.max(1, primary.tof_days || 1)));
}

function spacecraftPoint(primary = primaryMission()) {
  if (!primary?.polyline_au?.length) return [0, 0, 0];
  const index = Math.min(
    primary.polyline_au.length - 1,
    Math.round(missionProgress(primary) * (primary.polyline_au.length - 1))
  );
  return primary.polyline_au[index];
}

function missionTrackPoint(primary = primaryMission(), key = "target_track_au", nestedKey = null) {
  const track = nestedKey ? primary?.[key]?.[nestedKey] : primary?.[key];
  if (!track?.length) return [0, 0, 0];
  const index = Math.min(
    track.length - 1,
    Math.round(missionProgress(primary) * (track.length - 1))
  );
  return track[index];
}

function updateInspector() {
  const primary = primaryMission();
  const title = document.querySelector("[data-inspector-title]");
  const metrics = document.querySelector("[data-inspector-metrics]");
  if (!primary || !metrics) return;
  const inspected = state.inspectedObject;
  if (title) title.textContent = inspected;

  let rows;
  if (inspected === "Sun") {
    rows = [
      ["Type", "Star / map origin"],
      ["Position", "0.000, 0.000, 0.000 AU"],
      ["Viewer role", "heliocentric reference"]
    ];
  } else if (inspected === "Earth") {
    const earthPoint = missionTrackPoint(primary, "planet_tracks_au", "Earth");
    rows = [
      ["Type", "Planet"],
      ["Track", "neo-updater Earth ephemeris"],
      ["Position", `${formatNumber(earthPoint[0], 3)}, ${formatNumber(earthPoint[1], 3)}, ${formatNumber(earthPoint[2] || 0, 3)} AU`]
    ];
  } else if (inspected === "Spacecraft") {
    const point = spacecraftPoint(primary);
    rows = [
      ["Type", "Lambert transfer sample"],
      ["Mission time", `${formatNumber(state.time, 1)} d / ${formatNumber(primary.tof_days, 0)} d`],
      ["Position", `${formatNumber(point[0], 3)}, ${formatNumber(point[1], 3)}, ${formatNumber(point[2] || 0, 3)} AU`],
      ["Total dv", `${formatNumber(primary.total_dv_kms, 3)} km/s`]
    ];
  } else if (PLANET_NAMES.includes(inspected)) {
    const point = missionTrackPoint(primary, "planet_tracks_au", inspected);
    rows = [
      ["Type", "Planet"],
      ["Name", inspected],
      ["Track", "neo-updater planet_position_au"],
      ["Position", `${formatNumber(point[0], 3)}, ${formatNumber(point[1], 3)}, ${formatNumber(point[2] || 0, 3)} AU`]
    ];
  } else {
    const target = missionTrackPoint(primary, "target_track_au");
    rows = [
      ["Type", "Near-earth object"],
      ["Designation", primary.designation],
      ["Position", `${formatNumber(target[0], 3)}, ${formatNumber(target[1], 3)}, ${formatNumber(target[2] || 0, 3)} AU`],
      ["Semi-major axis", `${formatNumber(primary.semi_major_axis_au, 4)} AU`],
      ["Eccentricity", formatNumber(primary.eccentricity, 4)],
      ["Inclination", `${formatNumber(primary.inclination_deg, 3)} deg`]
    ];
  }

  metrics.innerHTML = rows.map(([labelText, value]) => (
    `<div class="metric"><span>${labelText}</span><code>${value}</code></div>`
  )).join("");
}

function applyCameraPreset(name) {
  if (name === "mission") {
    const primary = primaryMission();
    if (primary?.polyline_au?.length) {
      const framePoints = [
        ...(primary.polyline_au || []),
        ...(primary.target_track_au || []),
        ...(primary.planet_tracks_au?.Earth || [])
      ];
      const xs = framePoints.map((point) => point[0]);
      const ys = framePoints.map((point) => point[1]);
      const zs = framePoints.map((point) => point[2] || 0);
      state.cameraX = (Math.min(...xs) + Math.max(...xs)) / 2;
      state.cameraY = (Math.min(...ys) + Math.max(...ys)) / 2;
      state.cameraZ = (Math.min(...zs) + Math.max(...zs)) / 2;
      const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 0.35);
      state.zoom = Math.max(95, Math.min(360, 210 / extent));
    } else {
      state.cameraX = 0;
      state.cameraY = 0;
      state.cameraZ = 0;
      state.zoom = 160;
    }
    state.rotation = -28;
    state.tilt = 60;
    state.panX = 0;
    state.panY = 0;
  } else if (name === "inner") {
    state.cameraX = 0;
    state.cameraY = 0;
    state.cameraZ = 0;
    state.zoom = 170;
    state.rotation = -18;
    state.tilt = 0;
    state.panX = 0;
    state.panY = 0;
  } else {
    state.cameraX = 0;
    state.cameraY = 0;
    state.cameraZ = 0;
    state.zoom = 10;
    state.rotation = -38;
    state.tilt = 35;
    state.panX = 0;
    state.panY = 0;
  }
  const zoom = document.querySelector("[data-zoom-scrub]");
  const rotation = document.querySelector("[data-rotation-scrub]");
  if (zoom) zoom.value = String(state.zoom);
  if (rotation) rotation.value = String(state.rotation);
  drawAllViewers();
}

async function loadMissionPayload() {
  try {
    const response = await fetch("assets/neo-missions.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    missionPayload = await response.json();
  } catch {
    missionPayload = {
      mode: "fallback",
      counts: { asteroids: 0, close_approaches: 0, intercept_plans: 0 },
      objects: []
    };
  }
  if (!state.selectedIds.size && missionPayload.objects.length) {
    state.selectedIds.add(missionPayload.objects[0].designation);
  }
  document.querySelectorAll("[data-neo-count]").forEach((node) => {
    node.textContent = String(missionPayload.counts.asteroids || missionPayload.objects.length);
  });
  document.querySelectorAll("[data-plan-count]").forEach((node) => {
    node.textContent = String(missionPayload.counts.intercept_plans || missionPayload.objects.length);
  });
  applyCameraPreset("mission");
}

function initControls() {
  const search = document.querySelector("#neo-search");
  const time = document.querySelector("[data-time-scrub]");
  const play = document.querySelector("[data-play-toggle]");
  const restart = document.querySelector("[data-restart]");
  const speed = document.querySelector("[data-speed-select]");
  const repeat = document.querySelector("[data-repeat-toggle]");

  search?.addEventListener("input", renderObjectList);
  time?.addEventListener("input", () => {
    state.time = Number(time.value);
    updateMetrics();
    drawAllViewers();
  });
  play?.addEventListener("click", () => {
    state.playing = !state.playing;
    play.textContent = state.playing ? "Pause" : "Play";
  });
  restart?.addEventListener("click", () => {
    state.time = 0;
    if (time) time.value = "0";
    updateMetrics();
    drawAllViewers();
  });
  speed?.addEventListener("change", () => {
    state.speed = Number(speed.value);
  });
  repeat?.addEventListener("change", () => {
    state.repeat = repeat.checked;
  });
  document.querySelectorAll("[data-camera]").forEach((button) => {
    button.addEventListener("click", () => applyCameraPreset(button.dataset.camera));
  });
  document.querySelectorAll("[data-inspect-object]").forEach((button) => {
    button.addEventListener("click", () => {
      state.inspectedObject = button.dataset.inspectObject || "Target";
      updateInspector();
    });
  });
  document.querySelectorAll("#neo-canvas").forEach((canvas) => {
    if (canvas.hasAttribute("data-mini-viewer")) return;
    canvas.addEventListener("pointerdown", (event) => {
      state.drag = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, button: event.button };
      state.movedDuringDrag = false;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!state.drag) return;
      const dx = event.clientX - state.drag.x;
      const dy = event.clientY - state.drag.y;
      if (Math.abs(event.clientX - state.drag.startX) + Math.abs(event.clientY - state.drag.startY) > 4) {
        state.movedDuringDrag = true;
      }
      state.drag.x = event.clientX;
      state.drag.y = event.clientY;
      if (event.buttons === 2 || state.drag.button === 2) {
        state.rotation -= dx * 0.45;
        state.tilt -= dy * 0.35;
      } else {
        state.panX += dx;
        state.panY += dy;
      }
      drawAllViewers();
    });
    canvas.addEventListener("pointerup", (event) => {
      if (!state.movedDuringDrag) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const hit = nearestHit(canvas, x, y);
        if (hit) {
          if (hit.type === "mission") {
            state.selectedIds.clear();
            state.selectedIds.add(hit.id);
            state.inspectedObject = "Target";
            state.time = 0;
            const timeInput = document.querySelector("[data-time-scrub]");
            if (timeInput) timeInput.value = "0";
            applyCameraPreset("mission");
            renderObjectList();
          } else {
            state.inspectedObject = hit.object;
          }
          updateMetrics();
          drawAllViewers();
        }
      }
      state.drag = null;
    });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      state.zoom = Math.max(4, Math.min(520, state.zoom - event.deltaY * 0.08));
      const zoomInput = document.querySelector("[data-zoom-scrub]");
      if (zoomInput) zoomInput.value = String(Math.round(state.zoom));
      drawAllViewers();
    }, { passive: false });
  });
}

function nearestHit(canvas, x, y) {
  const targets = canvas.__neoHitTargets || [];
  let nearest = null;
  for (const target of targets) {
    const distance = Math.hypot(target.x - x, target.y - y);
    if (distance <= target.radius && (!nearest || distance < nearest.distance)) {
      nearest = { ...target, distance };
    }
  }
  return nearest;
}

function animate(frame) {
  const delta = state.lastFrame ? frame - state.lastFrame : 0;
  state.lastFrame = frame;
  const time = document.querySelector("[data-time-scrub]");
  if (state.playing) {
    const primary = primaryMission();
    const max = Math.max(1, primary?.tof_days || 180);
    state.time += (delta / 1000) * state.speed;
    if (state.time > max) {
      state.time = state.repeat ? 0 : max;
      state.playing = state.repeat;
      const play = document.querySelector("[data-play-toggle]");
      if (play) play.textContent = state.playing ? "Pause" : "Play";
    }
    if (time) time.value = String(Math.round(state.time));
    updateMetrics();
    drawAllViewers();
  }
  requestAnimationFrame(animate);
}

async function init() {
  initTheme();
  await loadMissionPayload();
  renderObjectList();
  initControls();
  updateMetrics();
  drawAllViewers();
  window.addEventListener("resize", drawAllViewers);
  requestAnimationFrame(animate);
}

document.addEventListener("DOMContentLoaded", init);
