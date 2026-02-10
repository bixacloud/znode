# Changing the Site Name in Search Results

**Category:** Websites and PHP

---

In Google search results and other search engines, you may see an additional name displayed above the page title. This is called the **Site Name**.

If you have a website hosted on a free subdomain, you may notice this label says "Znode." This article explains what this label is and how to change it.

## What Is the Site Name Label?

In addition to well-known meta tags like the page title and description, there are other attributes that provide search engines with more information about your website. These tags are defined through the OpenGraph standard.

The **Site Name** attribute describes the title of the entire website, while the page title covers the name of an individual page.

## Why Does the Site Name Say "Znode" for My Subdomain?

If you've configured a Site Name tag on your website, Google will use it in search results. However, if no such tag is found, Google will attempt to infer the site name.

For subdomains like `yourname.wuaze.com`, Google looks at both your subdomain and the base domain since they may be related. The base domain `wuaze.com` redirects to Znode's website, so Google assumes that the site name found on `wuaze.com` also applies to `yourname.wuaze.com`.

**Solution:** Set your own site name on your website to have full control over what is displayed.

## How to Add a Site Name Tag to Your Website

### Method 1: Add via HTML

Add the OpenGraph Site Name tag between the `<head>` and `</head>` tags on your pages:

```html
<meta property="og:site_name" content="My Awesome Website">
```

For best results, add this tag to all pages on your website with the same value everywhere.

### Method 2: Add via WordPress (Yoast SEO)

If you're using WordPress, the Yoast SEO plugin makes this easy:

1. Log in to your WordPress admin area.
2. Go to **Yoast SEO → Settings**.
3. Navigate to **General → Site Basics**.
4. Find the **"Website name"** field and update it as desired.
5. Save your changes.

## More Information

For more details about site names and how they work, see Google's official documentation: [Site Names in Google Search](https://developers.google.com/search/docs/appearance/site-names).
