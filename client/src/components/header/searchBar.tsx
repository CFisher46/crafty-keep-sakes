import React, { useEffect, useRef, useState } from "react";
import { Box, Drop, TextInput, Text, Heading } from "grommet";
import { FormSearch } from "grommet-icons";

interface SearchResult {
  id: number;
  name?: string;
  description?: string;
  title?: string;
  content?: string;
}

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    products: SearchResult[];
    blogs: SearchResult[];
  }>({ products: [], blogs: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], blogs: [] });
      return;
    }

    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const contentType = res.headers.get("Content-Type");

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setResults(data);
          setShowDropdown(true);
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (error) {
        console.error("Error fetching search results:", error);
        setResults({ products: [], blogs: [] }); // Clear results on error
      }
    };

    const timeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const highlight = (text: string) => {
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  };

  return (
    <Box pad="small">
      <TextInput
        ref={inputRef}
        placeholder="Search products, blogs..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onSelect={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        icon={<FormSearch />}
      />

      {showDropdown &&
        (results.products.length > 0 || results.blogs.length > 0) &&
        inputRef.current && (
          <Drop
            target={inputRef.current}
            align={{ top: "bottom", left: "left" }}
            elevation="medium"
            margin={{ top: "small" }}
            width="medium"
          >
            <Box pad="small" gap="small">
              {results.products.length > 0 && (
                <Box>
                  <Heading level="5" margin="none">
                    Products
                  </Heading>
                  {results.products.map((p) => (
                    <Box
                      key={`product-${p.id}`}
                      pad={{ vertical: "xsmall" }}
                      hoverIndicator
                    >
                      <Text
                        dangerouslySetInnerHTML={{
                          __html: highlight(p.name || "")
                        }}
                      />
                      <Text
                        size="small"
                        color="dark-5"
                        dangerouslySetInnerHTML={{
                          __html: highlight(p.description || "")
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
              {results.blogs.length > 0 && (
                <Box>
                  <Heading level="5" margin={{ top: "small", bottom: "none" }}>
                    Blogs
                  </Heading>
                  {results.blogs.map((b) => (
                    <Box
                      key={`blog-${b.id}`}
                      pad={{ vertical: "xsmall" }}
                      hoverIndicator
                    >
                      <Text
                        dangerouslySetInnerHTML={{
                          __html: highlight(b.title || "")
                        }}
                      />
                      <Text
                        size="small"
                        color="dark-5"
                        dangerouslySetInnerHTML={{
                          __html: highlight(b.content || "")
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Drop>
        )}
    </Box>
  );
};

export default SearchBar;
