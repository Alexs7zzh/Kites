import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

const HTMLText = ({ content, className = "" }) => {
  if (!content) return null;
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

const getImageUrl = (image) => {
  if (typeof image === "string") {
    return image;
  }
  return typeof image?.url === "string" ? image.url : "";
};

const getImageAlt = (image) => {
  if (typeof image === "string") {
    return "";
  }
  return typeof image?.alt === "string" ? image.alt : "";
};

const Content = forwardRef(({ data, isMobile, sectionRefs, turnstileSiteKey }, ref) => {
  const [formStatus, setFormStatus] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const turnstileContainerRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const pendingFormDataRef = useRef(null);
  const pendingFormRef = useRef(null);

  useEffect(() => {
    if (!turnstileSiteKey) {
      return undefined;
    }

    if (window.turnstile) {
      setTurnstileReady(true);
      return undefined;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => setTurnstileReady(true);
    script.onerror = () => setFormStatus("ERROR");
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const submitFormData = useCallback(
    (formData, formElement, tokenOverride) => {
      if (!data?.contact?.form_action) {
        setFormStatus("ERROR");
        return;
      }
      if (!turnstileSiteKey) {
        setFormStatus("TURNSTILE_CONFIG_ERROR");
        return;
      }
      const tokenToUse = tokenOverride || turnstileToken;
      if (!tokenToUse) {
        pendingFormDataRef.current = formData;
        pendingFormRef.current = formElement;
        setShowTurnstile(true);
        setFormStatus("AWAITING_CAPTCHA");
        if (turnstileReady && window.turnstile && turnstileWidgetIdRef.current) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        }
        return;
      }
      formData.set("cf-turnstile-response", tokenToUse);
      setFormStatus("SUBMITTING");
      fetch(data.contact.form_action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      })
        .then((response) => {
          if (response.ok) {
            setFormStatus("SUCCESS");
            formElement?.reset();
            setTurnstileToken("");
            setShowTurnstile(false);
            if (window.turnstile && turnstileWidgetIdRef.current) {
              window.turnstile.reset(turnstileWidgetIdRef.current);
            }
          } else {
            response.json().then((body) => {
              setFormStatus(Object.hasOwn(body, "errors") ? body["errors"].map((error) => error["message"]).join(", ") : "ERROR");
            });
          }
        })
        .catch(() => setFormStatus("ERROR"));
    },
    [data?.contact?.form_action, turnstileReady, turnstileToken, turnstileSiteKey]
  );

  useEffect(() => {
    if (!turnstileReady || !showTurnstile || !turnstileContainerRef.current || turnstileWidgetIdRef.current || !turnstileSiteKey) return;
    if (!window.turnstile) return;
    turnstileWidgetIdRef.current = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: turnstileSiteKey,
        callback: (token) => {
          setTurnstileToken(token);
          if (pendingFormDataRef.current) {
            submitFormData(pendingFormDataRef.current, pendingFormRef.current, token);
            pendingFormDataRef.current = null;
            pendingFormRef.current = null;
          }
        },
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setFormStatus("ERROR"),
      }
    );
  }, [showTurnstile, submitFormData, turnstileReady, turnstileSiteKey]);

  const handleSubmit = (event) => {
    event.preventDefault();
    submitFormData(new FormData(event.target), event.target);
  };

  if (!data) return <div style={{ padding: "50px" }}>Loading content...</div>;

  const scentComparisonImageLeft = data.scent.comparison_images?.[0];
  const scentComparisonImageRight = data.scent.comparison_images?.[1];

  return (
    <div ref={ref}>
      {/* --- ABOUT SECTION --- */}
      <div id="ABOUT" ref={(el) => (sectionRefs.current["ABOUT"] = el)} className="content-section">
        <img src={getImageUrl(data.about.main_image)} alt={getImageAlt(data.about.main_image)} style={{ width: isMobile ? "100%" : "50%", height: "auto", display: "block", marginLeft: "auto", marginRight: "auto" }} />
        <br /><br /><br />
        <HTMLText content={data.about.text_1} />
        <br /><br /><br /><br /><br /><br />
        <img src={getImageUrl(data.about.notation_image)} alt={getImageAlt(data.about.notation_image)} className="large-image" />
        <br /><br />
        <HTMLText content={data.about.text_2} />
      </div>

      {/* --- SCENT SECTION --- */}
      <div id="SCENT" ref={(el) => (sectionRefs.current["SCENT"] = el)} className="content-section">
        <img src={getImageUrl(data.scent.main_image)} alt={getImageAlt(data.scent.main_image)} className="large-image" />
        <br /><br />
        {data.scent.title} <br /><br />
        <HTMLText content={data.scent.description} />
        <br />
        <span className="special-font">{data.scent.details}</span>
        
        <div className="responsive-grid">
          {data.scent.comparison_images && (
            <>
              {getImageUrl(scentComparisonImageLeft) && (
                <img src={getImageUrl(scentComparisonImageLeft)} alt={getImageAlt(scentComparisonImageLeft)} style={{ width: "52%", height: "auto" }} />
              )}
              {getImageUrl(scentComparisonImageRight) && (
                <img src={getImageUrl(scentComparisonImageRight)} alt={getImageAlt(scentComparisonImageRight)} style={{ width: "44%", height: "auto" }} />
              )}
            </>
          )}
        </div>
      </div>

      {/* --- PROCESS SECTION --- */}
      <div id="PROCESS" ref={(el) => (sectionRefs.current["PROCESS"] = el)} className="content-section">
        <HTMLText content={data.process.text_1} /><br /><br />
        <HTMLText content={data.process.text_2} /><br /><br />
        <HTMLText content={data.process.text_3} />
        <br /><br />
        {data.process.gallery_images.map((image, index) => (
          getImageUrl(image) && <img key={index} src={getImageUrl(image)} alt={getImageAlt(image)} className="responsive-image" style={{marginBottom: '20px'}} />
        ))}
      </div>

      {/* --- STUDIO SECTION --- */}
      <div id="STUDIO" ref={(el) => (sectionRefs.current["STUDIO"] = el)} className="content-section">
        <div className="responsive-grid">
          {data.studio.header_images.map((image, i) => (
            getImageUrl(image) && <img key={i} src={getImageUrl(image)} alt={getImageAlt(image)} style={{ width: "31%", height: "auto" }} />
          ))}
        </div>
        <HTMLText content={data.studio.intro_text} />
        <br /><br />

        {data.studio.projects.map((project, index) => {
          const projectExtraImageUrl = getImageUrl(project.extra_image);
          const projectMainImageUrl = getImageUrl(project.main_image);
          const projectSecondaryImageUrl = getImageUrl(project.secondary_image);

          return (
            <div key={index} className="project-block">
              {projectExtraImageUrl && <img src={projectExtraImageUrl} alt={getImageAlt(project.extra_image)} className="responsive-image" />}
              
              <div className="caption-wrapper">
                <div className="caption-text">
                  <strong>{project.title}</strong><br /><br />
                  <HTMLText content={project.materials} />
                  {project.location && <><br /><br />{project.location}</>}
                </div>
                {projectMainImageUrl && <img src={projectMainImageUrl} alt={getImageAlt(project.main_image)} className="caption-image" />}
                {project.gallery && (
                  <div className="caption-image" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
                    {project.gallery.map((image, gIndex) => (
                      getImageUrl(image) && <img key={gIndex} src={getImageUrl(image)} alt={getImageAlt(image)} style={{ width: "48%", marginBottom: "10px" }} />
                    ))}
                  </div>
                )}
              </div>

              {projectSecondaryImageUrl && (
                <div className="caption-wrapper">
                  <div className="caption-text">{project.location}</div>
                  <img src={projectSecondaryImageUrl} className="responsive-image" alt={getImageAlt(project.secondary_image)} />
                </div>
              )}
              <br />
              {project.description && <p><HTMLText content={project.description} /></p>}
              {project.gallery_vertical && project.gallery_vertical.map((image, vIndex) => (
                getImageUrl(image) && <img key={vIndex} src={getImageUrl(image)} className="responsive-image" alt={getImageAlt(image)} style={{marginBottom: '20px'}} />
              ))}
            </div>
          );
        })}
      </div>

      {/* --- CONTACT SECTION --- */}
      <section id="CONTACT" ref={(el) => (sectionRefs.current["CONTACT"] = el)} className="content-section">
        <div className="bio-wrapper">
          <div className="bio-text">
            <HTMLText content={data.contact.bio_text} />
          </div>
          <img src={getImageUrl(data.contact.bio_image)} alt={getImageAlt(data.contact.bio_image)} className="bio-image" />
        </div>

        <div className="contact-block">
          <p className="contact-heading">Request &amp; Purchase</p>
          <form onSubmit={handleSubmit} className="contact-form">
            <label>Name <input type="text" name="name" required /></label>
            <label>Email <input type="email" name="email" required /></label>
            <label>Message <textarea name="message" rows="4" required></textarea></label>
            <button type="submit">Send</button>
            {showTurnstile && <div style={{ marginTop: "1rem" }}><div ref={turnstileContainerRef} /></div>}
            {formStatus === "SUCCESS" && <p style={{ marginTop: "1rem" }}>Thank you!</p>}
            {formStatus === "ERROR" && <p style={{ marginTop: "1rem", color: "red" }}>Oops! There was a problem.</p>}
            {formStatus === "TURNSTILE_CONFIG_ERROR" && (
              <p style={{ marginTop: "1rem", color: "red" }}>
                CAPTCHA is not configured.
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );
});

export default Content;
