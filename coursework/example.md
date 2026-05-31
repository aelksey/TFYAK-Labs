// Test program 1
$(1, l0l);

choice l0l
    option 1 : { $(100,r0r); }
    nooption { 
        $(120,r0r); 
    }
end

foreach (i0i in 1:10:1) {
    $(r0r + i0i, r0r);
}

when r0r > 0 {
    $(1, r0r);
} else {
    $(1, m0m);
}

// Test program 2
$(2, l0l);

choice l0l
    option 1 : { $(100,r0r); }
    nooption { 
        $(120,r0r); 
    }
end

foreach (i0i in 1:10:1) {
    $(r0r + i0i, r0r);
}

when r0r > 0 {
    $(2, r0r);
} else {
    $(1, m0m);
}