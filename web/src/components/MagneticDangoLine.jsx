import React, { useRef, useState, useEffect, useMemo } from "react";
import { useAnimationFrame } from "framer-motion";
import Content from "./Content";
import kitesLogoSvg from "../assets/Kites-Logo.svg?raw";
import "./MagneticDangoLine.css";
import "./styles.css";

const EMBEDDED_KITES_LOGO_SVG = kitesLogoSvg.trim();

// --- CONSTANTS ---
const DESKTOP_NAV_LOGO_X_POSITION = 200;
const DESKTOP_NAV_LOGO_SHIFT_START = 1200;
const DESKTOP_PARAGRAPH_RIGHT_OFFSET_VW = 10;
const DESKTOP_PARAGRAPH_WIDTH_VW = 55;
const MOBILE_NAV_LOGO_X_POSITION = 30;
const MOBILE_PARAGRAPH_RIGHT_OFFSET_VW = 0;
const MOBILE_PARAGRAPH_WIDTH_VW = 65;
const NAV_LOGO_SHIFT_END = 770;
const STROKE_WIDTH = 0.5;
const VISCOUS_LERP_SPEED = 0.08;
const DRAG_LERP_SPEED = 0.04;
const SAG_MULTIPLIER = 30;
const SAG_DIRECTION_LERP_SPEED = 0.005;
const UPWARD_WAVE_DAMPENING_STRENGTH = 10;
const WAVE_PARAM_LERP_SPEED = 0.01;
const MIN_AMPLITUDE = 10;
const MAX_AMPLITUDE = 15;
const MIN_FREQUENCY = 6;
const MAX_FREQUENCY = 8;
const MIN_WAVE_SPEED = 0.005;
const MAX_WAVE_SPEED = 0.01;
const MIN_CHANGE_INTERVAL_FRAMES = 1000;
const MAX_CHANGE_INTERVAL_FRAMES = 10000;
const BLOT_SCALE_FACTOR = 1.2;
const LINE_COUNT = 5;
const SPACING = 6.5;
const BUTTON_LABELS = ["ABOUT", "SCENT", "PROCESS", "STUDIO", "CONTACT"];
const Y_SCALE = 20;
const ANCHOR_X_PERCENT = 0;
const WAVY_LINE_RIGHT_MARGIN = 0;
const BUTTON_DOT_SPACING = 7;
const RIGHT_DECORATIVE_LINE_X_START_PERCENT = 0.9;
const DECORATIVE_LINE_OFFSET_Y = -10;
const DECORATIVE_LINE_OFFSET_START_PERCENT = 0;
const DECORATIVE_MIN_DOT_SPACING = 6.0;
const MOBILE_LOGO_Y_START = 20;
const LEFT_ELEMENT_Y_POSITIONS_PERCENT = [
  0.75, 0.7, 0.8, 0.96, 0.85, 0.72, 0.9, 0.95,
];
const LEFT_BUTTON_INDICES = [0, 2, 4, 6, 7];
const LOGO_Y_OFFSET = 250;
const DECORATIVE_LINE_Y_POSITIONS_PERCENT = [
  0.1, 0.16, 0.19, 0.22, 0.285, 0.38, 0.44, 0.48, 0.55, 0.6, 0.67, 0.75, 0.83,
  0.9,
];
const TOTAL_DECORATIVE_LINES = DECORATIVE_LINE_Y_POSITIONS_PERCENT.length;

const BLOT_PATHS = [
  "M4.3,2.3c0.1,1-0.5,1.9-1.4,2.2c-0.9,0.3-1.9-0.1-2.4-0.9c-0.5-0.8-0.2-1.9,0.6-2.5c0.8-0.6,1.9-0.4,2.5,0.4C4,1.8,4.2,2,4.3,2.3z",
  "M4.4,2.8c-0.2,0.9-1,1.5-1.9,1.5c-0.9,0-1.7-0.8-1.7-1.7c0-0.9,0.8-1.7,1.7-1.7c0.5,0,1,0.2,1.3,0.6C4.2,1.8,4.5,2.3,4.4,2.8z",
  "M4.1,1.5c0.4,0.8,0.2,1.8-0.5,2.4c-0.7,0.6-1.7,0.6-2.4,0c-0.7-0.6-0.8-1.6-0.2-2.3c0.6-0.7,1.6-0.8,2.3-0.2C3.5,1,3.8,1.2,4.1,1.5z",
  "M3.9,4.1c-0.8,0.4-1.8,0.2-2.4-0.5c-0.6-0.7-0.6-1.7,0-2.4c0.6-0.7,1.6-0.8,2.3-0.2c0.7,0.6,0.8,1.6,0.2,2.3C3.9,3.5,3.9,3.8,3.9,4.1z",
  "M2.4,4.4C1.5,4.5,0.8,4,0.4,3.3c-0.4-0.7-0.2-1.6,0.5-2.2c0.7-0.6,1.6-0.6,2.2-0.1c0.6,0.5,0.8,1.4,0.4,2.1C3.3,3.7,2.9,4.2,2.4,4.4z",
];

// --- HELPERS ---
const randomInRange = (min, max) => min + Math.random() * (max - min);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function groupDots(x, y, threshold) {
  const groupedY = [...y];
  const groups = [];
  const groupedIndices = new Set();
  let i = 0;
  while (i < x.length) {
    let groupIndices = [i];
    for (let j = i + 1; j < x.length && groupIndices.length < 6; j++) {
      if (Math.abs(y[j] - y[i]) < threshold) {
        groupIndices.push(j);
      } else {
        break;
      }
    }
    if (groupIndices.length > 1) {
      const avgY =
        groupIndices.reduce((acc, idx) => acc + y[idx], 0) /
        groupIndices.length;
      groupIndices.forEach((idx) => {
        groupedY[idx] = avgY;
        groupedIndices.add(idx);
      });
      groups.push({
        indices: groupIndices,
        startX: x[groupIndices[0]],
        endX: x[groupIndices[groupIndices.length - 1]],
        centerY: avgY,
      });
    }
    i += groupIndices.length;
  }
  return { groupedY, groups, groupedIndices };
}

// OPTIMIZED: Returns string instead of DOM element
function getMetaballPathString(group) {
  const count = group.indices.length;
  const spacing = count > 1 ? (group.endX - group.startX) / (count - 1) : 0;
  const r = 2 * BLOT_SCALE_FACTOR;
  let d = "";

  for (let i = 0; i < count; i++) {
    const currentX = group.startX + i * spacing;
    const currentY = group.centerY;
    if (i === 0) {
      d += `M ${currentX - r} ${currentY} A ${r} ${r} 0 0 1 ${currentX} ${
        currentY - r
      } `;
    }
    if (i < count - 1) {
      const nextX = currentX + spacing;
      const midX = (currentX + nextX) / 2;
      const pinchRadius = r * 0.95;
      d += `A ${r} ${r} 0 0 1 ${currentX + r * 0.8} ${currentY - r * 0.6} `;
      d += `Q ${midX} ${currentY - pinchRadius} ${nextX - r * 0.8} ${
        currentY - r * 0.6
      } `;
      d += `A ${r} ${r} 0 0 1 ${nextX} ${currentY - r} `;
    } else {
      d += `A ${r} ${r} 0 0 1 ${currentX + r} ${currentY} `;
    }
  }

  for (let i = count - 1; i >= 0; i--) {
    const currentX = group.startX + i * spacing;
    const currentY = group.centerY;
    if (i === count - 1) {
      d += `A ${r} ${r} 0 0 1 ${currentX} ${currentY + r} `;
    }
    if (i > 0) {
      const prevX = currentX - spacing;
      const midX = (currentX + prevX) / 2;
      const pinchRadius = r * 0.95;
      d += `A ${r} ${r} 0 0 1 ${currentX - r * 0.8} ${currentY + r * 0.6} `;
      d += `Q ${midX} ${currentY + pinchRadius} ${prevX + r * 0.8} ${
        currentY + r * 0.6
      } `;
      d += `A ${r} ${r} 0 0 1 ${prevX} ${currentY + r} `;
    } else {
      d += `A ${r} ${r} 0 0 1 ${currentX - r} ${currentY} `;
    }
  }
  d += "Z ";
  return d;
}

function calculatePiecewiseDotPositions(startX, endX, totalDots) {
  if (totalDots < 2) return totalDots === 1 ? [startX] : [];
  const idealNormalizedPositions = Array.from({ length: totalDots }, (_, i) => {
    const progress = i / (totalDots - 1);
    return easeInOutCubic(progress);
  });
  const totalWidth = endX - startX;
  let positions = idealNormalizedPositions.map((p) => startX + p * totalWidth);
  for (let i = 1; i < positions.length; i++) {
    const requiredPosition = positions[i - 1] + DECORATIVE_MIN_DOT_SPACING;
    if (positions[i] < requiredPosition) {
      positions[i] = requiredPosition;
    }
  }
  const lastPosition = positions[positions.length - 1];
  const currentTotalWidth = lastPosition - startX;
  if (currentTotalWidth > totalWidth) {
    const scaleFactor = totalWidth / currentTotalWidth;
    positions = positions.map((p) => startX + (p - startX) * scaleFactor);
  }
  positions[positions.length - 1] = endX;
  return positions;
}

export default function MagneticDangoLine({
  initialData = null,
  turnstileSiteKey = "",
}) {
  const svgRef = useRef(null);
  const scrollRef = useRef(null);
  const contentWrapperRef = useRef(null);
  const dotRefsArray = useRef(Array.from({ length: LINE_COUNT }, () => []));
  const dotYPositionsRef = useRef([]);
  const draggedYPositionsRef = useRef([]);
  const lastScrollTopRef = useRef(0);
  const lastScrollDirection = useRef("down");
  const smoothSagDirectionRef = useRef(1);
  const metaballPathRef = useRef(null); // Ref for single optimized path

  const sectionRefs = useRef({});

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [dotCount, setDotCount] = useState(100);
  const [rightDecorativeLines, setRightDecorativeLines] = useState([]);
  const [leftElements, setLeftElements] = useState([]);
  const [logoStyle, setLogoStyle] = useState({ opacity: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const [animationMaxScroll, setAnimationMaxScroll] = useState(0);
  const [activeSection, setActiveSection] = useState(BUTTON_LABELS[0]);
  const [navXPosition, setNavXPosition] = useState(DESKTOP_NAV_LOGO_X_POSITION);
  const data = initialData;

  const anchorYPositions = useMemo(() => {
    const height = windowSize.height;
    if (height === 0) return [];
    return DECORATIVE_LINE_Y_POSITIONS_PERCENT.slice(0, LINE_COUNT).map(
      (percent) => height * percent
    );
  }, [windowSize.height]);

  const decorativeLineYPixels = useMemo(() => {
    const height = windowSize.height;
    if (height === 0) return [];
    return DECORATIVE_LINE_Y_POSITIONS_PERCENT.map(
      (percent) => height * percent
    );
  }, [windowSize.height]);

  const frame = useRef(0);
  const nextChangeFrame = useRef(0);
  const targetAmplitude = useRef(3.0);
  const currentAmplitude = useRef(3.0);
  const targetFrequency = useRef(5.0);
  const currentFrequency = useRef(5.0);
  const targetWaveSpeed = useRef(0.008);
  const currentWaveSpeed = useRef(0.008);

  useEffect(() => {
    if (dotCount > 0 && anchorYPositions && anchorYPositions.length > 0) {
      dotYPositionsRef.current = Array.from({ length: LINE_COUNT }, (_, l) =>
        Array.from({ length: dotCount }, () => anchorYPositions[l])
      );
      draggedYPositionsRef.current = [...anchorYPositions];
    }
  }, [dotCount, anchorYPositions]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehavior = "";
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 770;
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    const contentElement = contentWrapperRef.current;
    if (!scrollElement || !contentElement) return;

    const calculateAnimationMaxScroll = () => {
      const scrollHeight = contentElement.scrollHeight;
      const clientHeight = scrollElement.clientHeight;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      setAnimationMaxScroll(maxScroll);
    };

    const resizeObserver = new ResizeObserver(calculateAnimationMaxScroll);
    resizeObserver.observe(contentElement);
    calculateAnimationMaxScroll();
    return () => resizeObserver.disconnect();
  }, [windowSize]);

  useEffect(() => {
    const calculateLayout = () => {
      if (
        typeof window === "undefined" ||
        windowSize.width === 0 ||
        windowSize.height === 0 ||
        decorativeLineYPixels.length === 0
      )
        return;

      const vw = window.innerWidth;
      const anchorX = vw * ANCHOR_X_PERCENT;
      const targetWidth = (isMobile ? vw * 0.7 : vw / 2) - anchorX;
      setDotCount(Math.max(0, Math.floor(targetWidth / SPACING)));

      const rightLinesXStart = isMobile
        ? vw * 0.7
        : vw * RIGHT_DECORATIVE_LINE_X_START_PERCENT;
      const rightLines = decorativeLineYPixels.map((yPos) => ({
        y: yPos,
        dotPositions: calculatePiecewiseDotPositions(
          rightLinesXStart,
          vw,
          Math.floor((vw - rightLinesXStart) / BUTTON_DOT_SPACING)
        ),
      }));
      setRightDecorativeLines(rightLines);

      const navShiftProgress = Math.min(
        1,
        Math.max(
          0,
          (vw - NAV_LOGO_SHIFT_END) /
            (DESKTOP_NAV_LOGO_SHIFT_START - NAV_LOGO_SHIFT_END)
        )
      );
      let calculatedNavX = lerp(
        MOBILE_NAV_LOGO_X_POSITION,
        DESKTOP_NAV_LOGO_X_POSITION,
        navShiftProgress
      );
      if (!isMobile) {
        const totalParagraphSpaceVW =
          DESKTOP_PARAGRAPH_WIDTH_VW + DESKTOP_PARAGRAPH_RIGHT_OFFSET_VW;
        const paragraphRightBufferPx = (vw * totalParagraphSpaceVW) / 100;
        const paragraphLeftEdgePx = vw - paragraphRightBufferPx;
        const navWidth = 120;
        const safetyGap = 50;
        const maxNavX = paragraphLeftEdgePx - navWidth - safetyGap;
        calculatedNavX = Math.min(calculatedNavX, maxNavX);
      }
      calculatedNavX = Math.max(MOBILE_NAV_LOGO_X_POSITION, calculatedNavX);

      setNavXPosition(calculatedNavX);
      const leftElementXStart = calculatedNavX;
      const leftDecoLineEndX = calculatedNavX + 120;

      const newLeftElements = LEFT_ELEMENT_Y_POSITIONS_PERCENT.map(
        (percent, index) => {
          const y = windowSize.height * percent;
          const isButton = LEFT_BUTTON_INDICES.includes(index);
          if (isButton) {
            const underlineStartX = 0;
            const underlineEndX = leftDecoLineEndX;
            const underlineWidth = underlineEndX - underlineStartX;
            return {
              key: `left-button-${index}`,
              type: "button",
              label: BUTTON_LABELS[LEFT_BUTTON_INDICES.indexOf(index)],
              y,
              underlineY: y + 20,
              dotPositions: calculatePiecewiseDotPositions(
                underlineStartX,
                underlineEndX,
                Math.floor(underlineWidth / BUTTON_DOT_SPACING)
              ),
            };
          } else {
            return {
              key: `left-deco-${index}`,
              type: "deco",
              y,
              dotPositions: calculatePiecewiseDotPositions(
                leftElementXStart,
                leftDecoLineEndX,
                Math.floor(
                  (leftDecoLineEndX - leftElementXStart) / BUTTON_DOT_SPACING
                )
              ),
            };
          }
        }
      );
      setLeftElements(newLeftElements);

      if (isMobile) {
        setLogoStyle({
          position: "absolute",
          top: `${MOBILE_LOGO_Y_START}px`,
          left: `${MOBILE_NAV_LOGO_X_POSITION}px`,
          width: "80px",
          height: "Auto",
          transition: "top 0.5s ease, width 0.5s ease, left 0.5s ease",
          opacity: 1,
        });
      } else {
        const firstButton = newLeftElements.find((el) => el.type === "button");
        if (firstButton) {
          setLogoStyle({
            position: "absolute",
            top: `${firstButton.y - LOGO_Y_OFFSET}px`,
            left: `${leftElementXStart}px`,
            width: "120px",
            height: "Auto",
            transition: "top 0.5s ease, width 0.5s ease, left 0.5s ease",
            opacity: 1,
          });
        }
      }
    };
    calculateLayout();
  }, [windowSize, decorativeLineYPixels, isMobile]);

  const updateActiveSection = (scrollTopValue) => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    const scrollOffset = scrollTopValue + scrollContainer.clientHeight * 0.3;
    let currentSection = BUTTON_LABELS[0];

    BUTTON_LABELS.forEach((label) => {
      const section = sectionRefs.current[label];
      if (section && section.offsetTop <= scrollOffset) {
        currentSection = label;
      }
    });

    if (currentSection !== activeSection) {
      setActiveSection(currentSection);
    }
  };

  useEffect(() => {
    if (!scrollRef.current) return;
    updateActiveSection(scrollRef.current.scrollTop);
  }, [leftElements]);

  useAnimationFrame(() => {
    if (
      windowSize.height === 0 ||
      anchorYPositions.length < LINE_COUNT ||
      draggedYPositionsRef.current.length < LINE_COUNT ||
      decorativeLineYPixels.length < TOTAL_DECORATIVE_LINES ||
      !dotYPositionsRef.current[0] ||
      dotYPositionsRef.current[0].length !== dotCount
    )
      return;

    frame.current++;
    const scrollDelta = scrollTop - lastScrollTopRef.current;
    const atBottom =
      animationMaxScroll > 0 && scrollTop >= animationMaxScroll - 2;
    const atTop = scrollTop <= 2;

    if (atBottom) lastScrollDirection.current = "down";
    else if (atTop) lastScrollDirection.current = "up";
    else if (scrollDelta > 0.5) lastScrollDirection.current = "down";
    else if (scrollDelta < -0.5) lastScrollDirection.current = "up";
    lastScrollTopRef.current = scrollTop;

    // PERFORMANCE FIX: No more DOM removal/creation here!

    const scrollProgress =
      animationMaxScroll > 0 ? Math.min(1, scrollTop / animationMaxScroll) : 0;
    const easedScrollProgress = easeInOutCubic(scrollProgress);
    const anchorX = window.innerWidth * ANCHOR_X_PERCENT;
    const topThreshold = 3;
    const bottomThreshold = 7;
    const dynamicThreshold = lerp(
      topThreshold,
      bottomThreshold,
      scrollProgress
    );

    if (frame.current > nextChangeFrame.current) {
      targetAmplitude.current = randomInRange(MIN_AMPLITUDE, MAX_AMPLITUDE);
      targetFrequency.current = randomInRange(MIN_FREQUENCY, MAX_FREQUENCY);
      targetWaveSpeed.current = randomInRange(MIN_WAVE_SPEED, MAX_WAVE_SPEED);
      nextChangeFrame.current =
        frame.current +
        randomInRange(MIN_CHANGE_INTERVAL_FRAMES, MAX_CHANGE_INTERVAL_FRAMES);
    }

    currentAmplitude.current = lerp(
      currentAmplitude.current,
      targetAmplitude.current,
      WAVE_PARAM_LERP_SPEED
    );
    currentFrequency.current = lerp(
      currentFrequency.current,
      targetFrequency.current,
      WAVE_PARAM_LERP_SPEED
    );
    currentWaveSpeed.current = lerp(
      currentWaveSpeed.current,
      targetWaveSpeed.current,
      WAVE_PARAM_LERP_SPEED
    );

    const DOTS = dotCount;
    const startStateX =
      window.innerWidth *
        (isMobile ? 0.7 : RIGHT_DECORATIVE_LINE_X_START_PERCENT) -
      WAVY_LINE_RIGHT_MARGIN;
    const endStateX = startStateX;
    const startYs = anchorYPositions;
    const endYs = decorativeLineYPixels.slice(-LINE_COUNT);

    let allMetaballsD = ""; // Accumulator for the single path

    for (let l = 0; l < LINE_COUNT; l++) {
      if (DOTS === 0 || !endYs[l]) continue;

      const currentLineEndX = lerp(startStateX, endStateX, scrollProgress);
      const currentWidth = currentLineEndX - anchorX;
      const x = Array.from({ length: DOTS }, (_, i) => {
        const ratio = DOTS > 1 ? i / (DOTS - 1) : 0;
        return anchorX + ratio * currentWidth;
      });

      const targetYPositions = (() => {
        const lineRatio = LINE_COUNT > 1 ? l / (LINE_COUNT - 1) : 0;
        const targetLeftY = lerp(
          startYs[0],
          windowSize.height * 0.4,
          lineRatio
        );
        let currentLeftY = lerp(startYs[l], targetLeftY, scrollProgress);
        if (l === 0) currentLeftY = startYs[l];

        const targetRightY = lerp(startYs[l], endYs[l], easedScrollProgress);
        let currentRightY;
        if (easedScrollProgress >= 1) {
          currentRightY = endYs[l];
          draggedYPositionsRef.current[l] = endYs[l];
        } else if (easedScrollProgress <= 0) {
          currentRightY = startYs[l];
          draggedYPositionsRef.current[l] = startYs[l];
        } else {
          draggedYPositionsRef.current[l] = lerp(
            draggedYPositionsRef.current[l],
            targetRightY,
            DRAG_LERP_SPEED
          );
          currentRightY = draggedYPositionsRef.current[l];
        }

        const yWaveComponent = x.map((_, i) => {
          const ratio = DOTS > 1 ? i / (DOTS - 1) : 0;
          const sine =
            Math.sin(
              currentFrequency.current * ratio +
                frame.current * currentWaveSpeed.current
            ) * ratio;
          const dampenedAmplitude = currentAmplitude.current;
          let baseWave = dampenedAmplitude * sine;
          if (baseWave < 0) {
            baseWave *= Math.pow(
              1 - easedScrollProgress,
              UPWARD_WAVE_DAMPENING_STRENGTH
            );
          }
          const targetDirection = lastScrollDirection.current === "up" ? -1 : 1;
          smoothSagDirectionRef.current = lerp(
            smoothSagDirectionRef.current,
            targetDirection,
            SAG_DIRECTION_LERP_SPEED
          );
          const baseSag = SAG_MULTIPLIER * ratio * ratio * scrollProgress;
          const sag = baseSag * smoothSagDirectionRef.current;
          return (baseWave + sag) * Y_SCALE * (1 - ratio);
        });

        const naturalY = x.map((_, i) => currentLeftY + yWaveComponent[i]);
        const rightEndPointNaturalY =
          naturalY[naturalY.length - 1] || currentLeftY;
        const correctionNeededAtRight = currentRightY - rightEndPointNaturalY;

        return naturalY.map((y, i) => {
          const ratio = DOTS > 1 ? i / (DOTS - 1) : 0;
          let finalY = y + correctionNeededAtRight * ratio;
          if (scrollProgress === 0) finalY += 1;
          if (scrollProgress >= 1) finalY += 3;
          return finalY;
        });
      })();

      const currentYPositions = dotYPositionsRef.current[l];
      const newYPositions = [];
      for (let i = 0; i < DOTS; i++) {
        const newY = lerp(
          currentYPositions[i],
          targetYPositions[i],
          VISCOUS_LERP_SPEED
        );
        newYPositions.push(newY);
      }
      dotYPositionsRef.current[l] = newYPositions;

      let groupedY, groups, groupedIndices;
      if (DOTS < 3) {
        ({ groupedY, groups, groupedIndices } = groupDots(
          x,
          newYPositions,
          dynamicThreshold
        ));
      } else {
        const mainX = x.slice(0, -2);
        const mainNewY = newYPositions.slice(0, -2);
        const {
          groupedY: mainGroupedY,
          groups: mainGroups,
          groupedIndices: mainGroupedIndices,
        } = groupDots(mainX, mainNewY, dynamicThreshold);
        const endAvgY = (newYPositions[DOTS - 2] + newYPositions[DOTS - 1]) / 2;
        const endGroup = {
          indices: [DOTS - 2, DOTS - 1],
          startX: x[DOTS - 2],
          endX: x[DOTS - 1],
          centerY: endAvgY,
        };
        groups = [...mainGroups, endGroup];
        groupedY = [...mainGroupedY, endAvgY, endAvgY];
        groupedIndices = new Set(mainGroupedIndices);
        groupedIndices.add(DOTS - 2);
        groupedIndices.add(DOTS - 1);
      }

      const finalIndicesToHide = new Set(groupedIndices);

      x.forEach((xi, i) => {
        const dot = dotRefsArray.current[l][i];
        if (dot) {
          dot.setAttribute(
            "transform",
            `translate(${xi}, ${groupedY[i]}) scale(${BLOT_SCALE_FACTOR})`
          );
          dot.style.display = finalIndicesToHide.has(i) ? "none" : "block";
        }
      });

      // OPTIMIZED: Append path string instead of creating elements
      groups.forEach((group) => {
        allMetaballsD += getMetaballPathString(group);
      });
    }

    // Apply the accumulated path data once per frame
    if (metaballPathRef.current) {
      metaballPathRef.current.setAttribute("d", allMetaballsD);
    }
  });

  const handleScroll = (e) => {
    const scrollTopValue = e.target.scrollTop;
    setScrollTop(scrollTopValue);
    updateActiveSection(scrollTopValue);
  };

  const handleNavClick = (sectionId) => {
    const sectionElement = sectionRefs.current[sectionId];
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const leftElementXStart = navXPosition;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100dvh",
          backgroundImage: "url(/2025-08-05-Background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          overflow: "hidden",
          overscrollBehavior: "none",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${windowSize.width} ${windowSize.height}`}
          style={{ width: "100%", height: "100%", position: "absolute" }}
        >
          {/* The individual dots */}
          {anchorYPositions.length > 0 &&
            Array.from({ length: LINE_COUNT }).flatMap((_, l) =>
              Array.from({ length: dotCount }).map((_, i) => (
                <path
                  key={`wavy-${l}-${i}`}
                  ref={(el) => (dotRefsArray.current[l][i] = el)}
                  d={BLOT_PATHS[(l + i) % BLOT_PATHS.length]}
                  fill="transparent"
                  stroke="rgba(0, 0, 0, 0.25)"
                  strokeWidth={STROKE_WIDTH}
                  vectorEffect="non-scaling-stroke"
                />
              ))
            )}

          {/* The single optimized path for all metaballs */}
          <path
            ref={metaballPathRef}
            className="metaball-path"
            fill="transparent"
            stroke="rgba(0, 0, 0, 0.25)"
            strokeWidth={STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
          />

          {rightDecorativeLines.map((line, lineIndex) => {
            const isOffsetApplicable =
              lineIndex < rightDecorativeLines.length - 6;
            return line.dotPositions.map((xPos, i) => {
              let finalY = line.y;
              const progress =
                line.dotPositions.length > 1
                  ? i / (line.dotPositions.length - 1)
                  : 1;
              if (
                isOffsetApplicable &&
                progress >= DECORATIVE_LINE_OFFSET_START_PERCENT
              ) {
                finalY += DECORATIVE_LINE_OFFSET_Y;
              }
              return (
                <path
                  key={`right-deco-${lineIndex}-${i}`}
                  d={BLOT_PATHS[i % BLOT_PATHS.length]}
                  fill="transparent"
                  stroke="rgba(0, 0, 0, 0.25)"
                  strokeWidth={STROKE_WIDTH}
                  vectorEffect="non-scaling-stroke"
                  transform={`translate(${xPos}, ${finalY}) scale(${BLOT_SCALE_FACTOR})`}
                />
              );
            });
          })}

          {leftElements.map((element) => {
            if (!element.dotPositions) return null;
            const yPos =
              element.type === "button" ? element.underlineY : element.y;
            return element.dotPositions.map((xPos, i) => (
              <path
                key={`${element.key}-dot-${i}`}
                d={BLOT_PATHS[i % BLOT_PATHS.length]}
                fill="transparent"
                stroke="rgba(0, 0, 0, 0.25)"
                strokeWidth={STROKE_WIDTH}
                vectorEffect="non-scaling-stroke"
                transform={`translate(${xPos}, ${yPos}) scale(${BLOT_SCALE_FACTOR})`}
              />
            ));
          })}
        </svg>

        <div
          dangerouslySetInnerHTML={{ __html: EMBEDDED_KITES_LOGO_SVG }}
          role="img"
          aria-label="Kites"
          style={logoStyle}
        />

        {leftElements.map((element) => {
          if (element.type === "button") {
            const isActive = activeSection === element.label;
            return (
              <div
                key={element.key}
                onClick={() => handleNavClick(element.label)}
                style={{
                  position: "absolute",
                  top: `${element.y}px`,
                  left: `${leftElementXStart}px`,
                  transform: "translateY(-50%)",
                  color: isActive ? "black" : "grey",
                  fontSize: "12px",
                  fontFamily: "'Victor Mono', monospace",
                  pointerEvents: "auto",
                  cursor: "pointer",
                  transition:
                    "color 0.3s ease, left 0.5s ease, font-weight 0.3s ease",
                  fontWeight: "500",
                }}
              >
                {element.label}
              </div>
            );
          }
          return null;
        })}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="scrollable-text-container"
          style={{
            position: "absolute",
            top: 0,
            right: `${
              isMobile
                ? MOBILE_PARAGRAPH_RIGHT_OFFSET_VW
                : DESKTOP_PARAGRAPH_RIGHT_OFFSET_VW
            }vw`,
            width: `${
              isMobile ? MOBILE_PARAGRAPH_WIDTH_VW : DESKTOP_PARAGRAPH_WIDTH_VW
            }vw`,
            height: "100dvh",
            overflowY: "scroll",
            padding: isMobile ? "60px 20px" : "60px 80px",
            boxSizing: "border-box",
            color: "black",
            fontFamily: "'Victor Mono', monospace",
            fontSize: "12px",
            lineHeight: "2",
          }}
        >
          <br />

          {/* Imported Content Component */}
          <Content
            ref={contentWrapperRef}
            data={data}
            isMobile={isMobile}
            sectionRefs={sectionRefs}
            turnstileSiteKey={turnstileSiteKey}
          />
        </div>
      </div>
    </>
  );
}
