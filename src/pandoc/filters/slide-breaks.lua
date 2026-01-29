-- slide-breaks.lua
-- Controls slide boundaries in PPTX output based on slide_breaks metadata
-- Modes: h1, h2 (default), hr

local slide_breaks_mode = "h2"

-- Read slide_breaks from metadata
function Meta(meta)
  if meta.slide_breaks then
    slide_breaks_mode = pandoc.utils.stringify(meta.slide_breaks)
  end
  return meta
end

-- Process headers to control slide boundaries
function Header(elem)
  if slide_breaks_mode == "h1" then
    -- h1 mode: Only H1 creates slides
    -- Demote H2 to H3, H3 to H4, etc. so they don't create slides
    if elem.level >= 2 then
      elem.level = elem.level + 1
      return elem
    end
  elseif slide_breaks_mode == "h2" then
    -- h2 mode (default): H1 and H2 create slides
    -- No changes needed, this is Pandoc's default with slide-level=2
    return elem
  elseif slide_breaks_mode == "hr" then
    -- hr mode: H1 and H2 create slides (same as h2)
    -- HorizontalRule will also create slide breaks
    return elem
  end

  return elem
end

-- Process horizontal rules for slide breaks
function HorizontalRule()
  if slide_breaks_mode == "hr" then
    -- In 'hr' mode, horizontal rules become slide breaks
    -- We do this by inserting an H2 with empty content
    -- Pandoc will treat this as a new slide boundary
    return pandoc.Header(2, {})
  end
  -- In other modes, horizontal rules are removed (not meaningful in slides)
  return {}
end

-- Return filters in correct order (Meta first)
return {
  { Meta = Meta },
  { Header = Header, HorizontalRule = HorizontalRule }
}
