import { useEffect, useMemo, useState } from "react";

const PREVIEW_SIZE = 240;

export default function AvatarCropModal({ file, onCancel, onSave, saving = false }) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(50);
  const [offsetY, setOffsetY] = useState(50);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setSourceUrl("");
    setImageSize(null);
    setZoom(1);
    setOffsetX(50);
    setOffsetY(50);
    setError("");

    if (!file) return undefined;
    const reader = new FileReader();
    reader.onload = () => {
      if (!cancelled && typeof reader.result === "string") setSourceUrl(reader.result);
    };
    reader.onerror = () => {
      if (!cancelled) setError("Không đọc được file ảnh. Hãy chọn ảnh PNG, JPG hoặc WEBP khác.");
    };
    reader.readAsDataURL(file);
    return () => { cancelled = true; reader.abort?.(); };
  }, [file]);

  const previewGeometry = useMemo(() => {
    if (!imageSize) return null;
    const scale = (PREVIEW_SIZE / Math.min(imageSize.width, imageSize.height)) * zoom;
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;
    return {
      width,
      height,
      left: -(width - PREVIEW_SIZE) * (offsetX / 100),
      top: -(height - PREVIEW_SIZE) * (offsetY / 100),
    };
  }, [imageSize, zoom, offsetX, offsetY]);

  const handleImageLoad = (event) => {
    const image = event.currentTarget;
    if (!image.naturalWidth || !image.naturalHeight) {
      setError("Ảnh không hợp lệ hoặc không được trình duyệt hỗ trợ.");
      return;
    }
    setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    setError("");
  };

  const handleSave = () => {
    if (!sourceUrl || !imageSize) {
      setError("Đang tải ảnh xem trước. Vui lòng chờ một chút rồi thử lại.");
      return;
    }
    setError("");
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
      const sx = (image.naturalWidth - side) * (offsetX / 100);
      const sy = (image.naturalHeight - side) * (offsetY / 100);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Trình duyệt không hỗ trợ công cụ crop ảnh.");
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, sx, sy, side, side, 0, 0, 512, 512);
      try {
        onSave(canvas.toDataURL("image/png"));
      } catch {
        setError("Không thể xử lý ảnh này. Hãy thử chọn ảnh khác.");
      }
    };
    image.onerror = () => setError("Không thể đọc ảnh này. Hãy chọn ảnh PNG, JPG hoặc WEBP.");
    image.src = sourceUrl;
  };

  return (
    <div className="avatar-crop-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
      <section className="avatar-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
        <div className="avatar-crop-heading">
          <div>
            <h2 id="avatar-crop-title">Căn chỉnh ảnh đại diện</h2>
            <p>Kéo thanh căn chỉnh để chọn vùng ảnh, sau đó điều chỉnh độ phóng đại.</p>
          </div>
          <button type="button" className="avatar-crop-close" onClick={onCancel} disabled={saving} aria-label="Đóng">×</button>
        </div>

        <div className="avatar-crop-preview-wrap">
          <div className="avatar-crop-preview" aria-label="Xem trước ảnh đại diện đã cắt">
            {sourceUrl && (
              <img
                src={sourceUrl}
                alt=""
                draggable="false"
                onLoad={handleImageLoad}
                onError={() => setError("Không thể hiển thị ảnh đã chọn. Hãy chọn ảnh PNG, JPG hoặc WEBP khác.")}
                style={previewGeometry ? {
                  width: `${previewGeometry.width}px`,
                  height: `${previewGeometry.height}px`,
                  left: `${previewGeometry.left}px`,
                  top: `${previewGeometry.top}px`,
                } : { width: "100%", height: "100%", objectFit: "contain" }}
              />
            )}
            {!sourceUrl && !error && <span className="avatar-crop-loading">Đang tải ảnh…</span>}
          </div>
          <span className="avatar-crop-preview-note">Ảnh sẽ hiển thị dạng hình tròn</span>
        </div>

        <div className="avatar-crop-controls">
          <label>Phóng to <span>{zoom.toFixed(1)}×</span>
            <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={!imageSize || saving} />
          </label>
          <label>Căn trái / phải
            <input type="range" min="0" max="100" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} disabled={!imageSize || saving || (imageSize && imageSize.width <= imageSize.height && zoom === 1)} />
          </label>
          <label>Căn trên / dưới
            <input type="range" min="0" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} disabled={!imageSize || saving || (imageSize && imageSize.height <= imageSize.width && zoom === 1)} />
          </label>
        </div>
        {error && <div className="avatar-crop-error" role="alert">{error}</div>}
        <div className="avatar-crop-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>Hủy</button>
          <button type="button" className="primary-button" onClick={handleSave} disabled={saving || !imageSize}>{saving ? "Đang lưu…" : "Dùng ảnh này"}</button>
        </div>
      </section>
    </div>
  );
}
