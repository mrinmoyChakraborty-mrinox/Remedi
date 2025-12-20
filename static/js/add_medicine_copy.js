document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ add_medicine.js loaded");

  const container = document.getElementById("medicineCards");
  const addBtn = document.getElementById("addAnotherBtn");
  const nextBtn = document.getElementById("nextBtn");
  const autoSaveToggle = document.getElementById("autoSaveToggle");
  const autoSaveStatus = document.getElementById("autoSaveStatus");
  
  let autoSaveEnabled = true;
  let saveTimeout = null;
  let isLoadingDraft = false; // Flag to prevent auto-save during load

  // Store the original template before any modifications
  const originalTemplate = document.querySelector(".medicine-card").cloneNode(true);

  // ----------------------------
  // Load existing draft on page load
  // ----------------------------
  await loadDraft();

  // ----------------------------
  // Collect ALL medicines
  // ----------------------------
  function collectMedicines() {
    return Array.from(document.querySelectorAll(".medicine-card")).map(card => {
      const q = sel => card.querySelector(sel);
      
    // Variables to hold our result
    let times = [];
    let todSelection = {};

    // 1. Check if any "Time of Day" checkboxes are selected
    const checkedTods = card.querySelectorAll('.tod-item input[type="checkbox"]:checked');

    if (checkedTods.length > 0) {
      // --- LOGIC: MULTI-TIME (Time of Day) ---
      console.log("Saving Multi-Time selection...");
      
      checkedTods.forEach(checkbox => {
        const parent = checkbox.closest('.tod-item');
        const timeInput = parent.querySelector('input[type="time"]');
        const timeVal = timeInput ? timeInput.value : ""; // e.g. "08:00"

        if (timeVal) {
            // Save to Map for UI restoration: { "Morning": "08:00" }
            todSelection[checkbox.value] = timeVal;
            // Save to Array for Backend Scheduler: ["08:00"]
            times.push(timeVal);
        }
      });

    } else {
      // --- LOGIC: SINGLE TIME (Bottom Input) ---
      console.log("Saving Single-Time selection...");
      
      const singleTimeInput = q('[name$="[schedule][time]"]');
      if (singleTimeInput && singleTimeInput.value) {
        times.push(singleTimeInput.value);
      }
    }

    // Sort times so 08:00 comes before 20:00
    times.sort();
      return {
        medicine: {
          name: q('[name$="[name]"]')?.value || "",
          dosage: q('[name$="[dosage]"]')?.value || "",
          quantity: Number(q('[name$="[quantity]"]')?.value || 0),
          medium: q('[name$="[medium]"]:checked')?.value || "",
          food: q('[name$="[food]"]:checked')?.value || "",
          notes: q('[name$="[notes]"]')?.value || ""
        },
        schedule: {
          start_date: q('[name$="[schedule][start_date]"]')?.value || null,
          duration_days: Number(q('[name$="[schedule][duration]"]')?.value || 0),
          days: JSON.parse(q('[name$="[schedule][days]"]')?.value || "[]"),
          times: times,           
          tod_selection: todSelection, 
          quantity_per_dose: Number(q('[name$="[schedule][quantity_per_dose]"]')?.value || 1),
          reminder_enabled: q('[name$="[schedule][reminder]"]')?.checked ?? true,
          snooze_minutes: 10
        }
      };
    });
  }

  // ----------------------------
  // Save draft to backend
  // ----------------------------
  async function saveDraft() {
    if (isLoadingDraft) {
      console.log("⏸️ Skipping save during draft load");
      return;
    }

    const medicines = collectMedicines();

    // Don't save if all medicines are empty
    const hasData = medicines.some(m => 
      m.medicine.name || 
      m.medicine.dosage || 
      m.medicine.quantity > 0
    );

    if (!hasData) {
      console.log("⏸️ Skipping save - no data entered");
      return;
    }

    try {
      const response = await fetch("/api/draft/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicines })
      });

      if (response.ok) {
        console.log("💾 Draft saved:", medicines);
        if (autoSaveStatus) {
          autoSaveStatus.textContent = "Saved ✓";
          setTimeout(() => {
            if (autoSaveEnabled) {
              autoSaveStatus.textContent = "Saving automatically";
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Save failed:", error);
    }
  }

  // ----------------------------
  // Load draft from backend
  // ----------------------------
  async function loadDraft() {
    isLoadingDraft = true; // Prevent auto-save during load

    try {
      const res = await fetch("/api/draft/load");
      const data = await res.json();

      if (data.draft && data.draft.medicines && data.draft.medicines.length > 0) {
        console.log("📥 Loading draft:", data.draft);
        
        // Clear existing cards
        container.innerHTML = "";

        // Render each medicine from draft
        data.draft.medicines.forEach((item, index) => {
          renderMedicineCard(item, index);
        });
      } else {
        // No draft - keep the default card
        console.log("ℹ️ No draft found - using empty form");
      }
    } catch (error) {
      console.error("Load draft failed:", error);
    } finally {
      // Re-enable auto-save after 1 second delay
      setTimeout(() => {
        isLoadingDraft = false;
        console.log("✅ Draft loading complete - auto-save enabled");
      }, 1000);
    }
  }

  // ----------------------------
  // Render a medicine card with data
  // ----------------------------
  function renderMedicineCard(data, index) {
    const clone = originalTemplate.cloneNode(true);
    
    clone.dataset.index = index;
    
    const titleEl = clone.querySelector("h3");
    if (titleEl) titleEl.innerText = `Medicine ${index + 1}`;
    
    clone.classList.remove("collapsed");
    const cloneBody = clone.querySelector(".card-body");
    if (cloneBody) cloneBody.style.display = "block";

    // Update all input names
    clone.querySelectorAll("input, textarea").forEach(el => {
      if (el.name) {
        el.name = el.name.replace(/\[0\]/, `[${index}]`);
      }
      if (el.id) {
        el.id = el.id.replace(/-0-/, `-${index}-`);
      }
    });

    // Update labels
    clone.querySelectorAll("label[for]").forEach(label => {
      const forAttr = label.getAttribute("for");
      if (forAttr) {
        label.setAttribute("for", forAttr.replace(/-0-/, `-${index}-`));
      }
    });

    // Populate with data
    if (data) {
      const q = sel => clone.querySelector(sel);
      
      // Medicine fields
      if (q('[name$="[name]"]')) q('[name$="[name]"]').value = data.medicine.name || "";
      if (q('[name$="[dosage]"]')) q('[name$="[dosage]"]').value = data.medicine.dosage || "";
      if (q('[name$="[quantity]"]')) q('[name$="[quantity]"]').value = data.medicine.quantity || "";
      if (q('[name$="[notes]"]')) q('[name$="[notes]"]').value = data.medicine.notes || "";
      
      // Medium radio
      if (data.medicine.medium) {
        const mediumRadio = q(`[name$="[medium]"][value="${data.medicine.medium}"]`);
        if (mediumRadio) mediumRadio.checked = true;
      }
      
      // Food radio
      if (data.medicine.food) {
        const foodRadio = q(`[name$="[food]"][value="${data.medicine.food}"]`);
        if (foodRadio) foodRadio.checked = true;
      }

      // Schedule fields
      if (q('[name$="[schedule][start_date]"]')) q('[name$="[schedule][start_date]"]').value = data.schedule.start_date || "";
      if (q('[name$="[schedule][duration]"]')) q('[name$="[schedule][duration]"]').value = data.schedule.duration_days || "";
       // --- RESTORE TIMES ---
      const hasTodData = data.schedule.tod_selection && Object.keys(data.schedule.tod_selection).length > 0;

      if (hasTodData) {
          // --- SCENARIO: MULTI-TIME ---
          // Iterate through the saved dictionary { "Morning": "08:00", ... }
          Object.entries(data.schedule.tod_selection).forEach(([periodLabel, timeVal]) => {
              // 1. Find the checkbox (e.g., value="Morning")
              const checkbox = clone.querySelector(`.tod-item input[value="${periodLabel}"]`);
              
              if (checkbox) {
                  // 2. Check it
                  checkbox.checked = true;

                  // 3. Show the hidden time input next to it
                  const timeContainer = checkbox.closest('.tod-item').querySelector('.time-input-container');
                  if (timeContainer) {
                      timeContainer.style.display = "inline-block";
                      
                      // 4. Fill the time value
                      const timeInput = timeContainer.querySelector('input[type="time"]');
                      if (timeInput) timeInput.value = timeVal;
                  }
              }
          });

      } else {
          // --- SCENARIO: SINGLE TIME ---
          // If we have times saved in the array (e.g. ["14:00"]), put the first one in the bottom input
          if (data.schedule.times && data.schedule.times.length > 0) {
              const singleTimeInput = clone.querySelector('[name$="[schedule][time]"]');
              if (singleTimeInput) {
                  singleTimeInput.value = data.schedule.times[0];
              }
          }
      }
      if (q('[name$="[schedule][quantity_per_dose]"]')) q('[name$="[schedule][quantity_per_dose]"]').value = data.schedule.quantity_per_dose || 1;
      if (q('[name$="[schedule][reminder]"]')) q('[name$="[schedule][reminder]"]').checked = data.schedule.reminder_enabled ?? true;

      // Days selection
      if (data.schedule.days && data.schedule.days.length > 0) {
        data.schedule.days.forEach(day => {
          const dayBtn = q(`.day[data-day="${day}"]`);
          if (dayBtn) dayBtn.classList.add("selected");
        });
        const daysInput = q('[name$="[schedule][days]"]');
        if (daysInput) daysInput.value = JSON.stringify(data.schedule.days);
      }
    }

    container.appendChild(clone);
  }

  // ----------------------------
  // Auto-save functionality
  // ----------------------------
  if (autoSaveToggle) {
    autoSaveToggle.checked = true; // Start enabled
    
    autoSaveToggle.addEventListener("change", () => {
      autoSaveEnabled = autoSaveToggle.checked;
      if (autoSaveStatus) {
        autoSaveStatus.textContent = autoSaveEnabled ? "Saving automatically" : "Auto-save off";
        autoSaveStatus.className = autoSaveEnabled ? "autosave-status autosave-on" : "autosave-status autosave-off";
      }
    });
  }

  // Trigger auto-save on input changes
  container.addEventListener("input", () => {
    if (!autoSaveEnabled || isLoadingDraft) return;
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveDraft();
    }, 1500); // Save 1.5 seconds after user stops typing
  });

  container.addEventListener("change", () => {
    if (!autoSaveEnabled || isLoadingDraft) return;
    saveDraft();
  });

  // ----------------------------
  // Manual save buttons
  // ----------------------------
  container.addEventListener("click", (e) => {
    if (e.target.classList.contains("manual-save-btn")) {
      isLoadingDraft = false; // Allow manual save
      saveDraft();
    }
  });

  // ----------------------------
  // Add new medicine card
  // ----------------------------
  addBtn.addEventListener("click", () => {
    // Collapse all existing cards
    document.querySelectorAll(".medicine-card").forEach(card => {
      card.classList.add("collapsed");
      const body = card.querySelector(".card-body");
      if (body) body.style.display = "none";
    });

    const index = document.querySelectorAll(".medicine-card").length;
    renderMedicineCard(null, index);
  });

  // ----------------------------
  // Remove medicine card
  // ----------------------------
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".action-box--remove");
    if (!btn) return;

    const cards = document.querySelectorAll(".medicine-card");
    if (cards.length === 1) {
      alert("At least one medicine required");
      return;
    }

    btn.closest(".medicine-card").remove();
    if (autoSaveEnabled && !isLoadingDraft) saveDraft();
  });

  // ----------------------------
  // Toggle card collapse/expand
  // ----------------------------
  container.addEventListener("click", e => {
    const toggle = e.target.closest(".action-box--toggle");
    if (!toggle) return;

    const card = toggle.closest(".medicine-card");
    const body = card.querySelector(".card-body");

    if (!body) return;

    const isOpen = body.style.display !== "none";
    body.style.display = isOpen ? "none" : "block";
    card.classList.toggle("collapsed", isOpen);
    toggle.setAttribute("aria-expanded", !isOpen);
  });

  // ----------------------------
  // Day selection handler
  // ----------------------------
  container.addEventListener("click", e => {
    if (!e.target.classList.contains("day")) return;

    const card = e.target.closest(".medicine-card");
    e.target.classList.toggle("selected");

    const days = Array.from(card.querySelectorAll(".day.selected")).map(d => d.dataset.day);

    const daysInput = card.querySelector('input[name*="[schedule][days]"]');
    if (daysInput) {
      daysInput.value = JSON.stringify(days);
    }
    
    if (autoSaveEnabled && !isLoadingDraft) saveDraft();
  });

  // ----------------------------
  // NEXT → Confirmation
  // ----------------------------
  nextBtn?.addEventListener("click", async () => {
    isLoadingDraft = false; // Allow saving before navigation
    await saveDraft();
    window.location.href = "/confirmation";
  });
});