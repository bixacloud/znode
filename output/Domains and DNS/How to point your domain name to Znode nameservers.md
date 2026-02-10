# How to Point Your Domain Name to Znode Nameservers

Before adding your domain name to your hosting account, you need to point it to Znode's nameservers. This guide walks you through the process.

---

## Step 0: Find the Correct Nameservers

Use the following nameservers:

```
ns1.byet.org
ns2.byet.org
ns3.byet.org
ns4.byet.org
ns5.byet.org
```

**Note:** These nameservers are primarily used for initial domain verification. After adding the domain to your account, you can switch to any nameservers you prefer.

---

## Step 1: Access Your Domain's Management Area

1. Log in to your domain registrar's client area
2. Navigate to your Domain List
3. Find and select your domain

---

## Step 2: Go to the Nameservers Setting

Changing nameservers is done through a dedicated setting in your domain registrar's panel. This is **different** from the DNS Records section.

Look for options like:
- "Nameservers"
- "Custom Nameservers"
- "DNS Servers"

---

## Step 3: Set the Custom Nameservers

1. Select the option to use **Custom Nameservers**
2. Remove any currently configured nameservers
3. Add the nameservers from Step 0
4. Save the changes

**Example configuration:**

| Nameserver | Value |
|------------|-------|
| NS1 | `ns1.byet.org` |
| NS2 | `ns2.byet.org` |
| NS3 | `ns3.byet.org` |
| NS4 | `ns4.byet.org` |
| NS5 | `ns5.byet.org` |

---

## Step 4: Wait for Propagation

After saving, changes need time to propagate across the internet. This can take anywhere from a few hours to a few days.

Once propagation is complete, your domain will be pointed to Znode's nameservers, and you can proceed with adding your domain to your hosting account.

---

## Common Registrar Instructions

The exact steps vary by registrar, but the general process is similar:

1. Find the nameservers or DNS settings
2. Switch from default/registrar nameservers to custom
3. Enter Znode's nameservers
4. Save and wait

If your registrar has specific documentation, follow their instructions for changing nameservers to custom values.

---

## Troubleshooting

### Registrar Rejects the Nameserver Change

Some registrars or domain extensions require DNS records to exist before allowing nameserver changes. In this case, use CNAME verification instead.

See: [Can't change nameservers to Znode](Cant%20change%20nameservers%20to%20Znode.md)

### Domain Still Not Working After 72 Hours

Check that:
- Nameservers were saved correctly
- Your domain hasn't expired
- The domain was added to your Znode account

See: [Why isn't my domain working yet?](Why%20isnt%20my%20domain%20working%20yet.md)
