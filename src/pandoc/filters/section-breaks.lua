-- section-breaks.lua
-- Controls page/section breaks in DOCX output based on section_breaks metadata
-- Modes: auto (default), all, none

local section_breaks_mode = "auto"

-- Read section_breaks from metadata
function Meta(meta)
  if meta.section_breaks then
    section_breaks_mode = pandoc.utils.stringify(meta.section_breaks)
  end
  return meta
end

-- Create a DOCX page break as raw OpenXML
local function page_break()
  return pandoc.RawBlock('openxml', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
end

-- Process headers to insert page breaks
function Header(elem)
  if section_breaks_mode == "none" then
    return elem
  end

  if section_breaks_mode == "auto" then
    -- Auto mode: page break before H2 only
    if elem.level == 2 then
      return { page_break(), elem }
    end
  elseif section_breaks_mode == "all" then
    -- All mode: page break before H2 and H3
    if elem.level == 2 or elem.level == 3 then
      return { page_break(), elem }
    end
  end

  return elem
end

-- Process horizontal rules
function HorizontalRule()
  if section_breaks_mode == "all" then
    -- In 'all' mode, horizontal rules become page breaks
    return page_break()
  end
  -- In other modes, keep horizontal rule as-is
  return nil
end

-- Return filters in correct order (Meta first)
return {
  { Meta = Meta },
  { Header = Header, HorizontalRule = HorizontalRule }
}
