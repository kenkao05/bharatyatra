var simplemaps_countrymap_mapdata={
  main_settings: {
   //General settings
    width: "responsive", //'700' or 'responsive'
    background_color: "#FFFFFF",
    background_transparent: "yes",
    border_color: "#000000",
    
    //State defaults
    state_description: "State description",
    state_color: "#88A4BC",
    state_hover_color: "#3B729F",
    state_url: "",
    border_size: 4,
    all_states_inactive: "no",
    all_states_zoomable: "yes",
    
    //Location defaults
    location_description: "Location description",
    location_url: "",
    location_color: "#FF0067",
    location_opacity: 0.8,
    location_hover_opacity: 1,
    location_size: 25,
    location_type: "square",
    location_image_source: "frog.png",
    location_border_color: "#FFFFFF",
    location_border: 5,
    location_hover_border: 2.5,
    all_locations_inactive: "no",
    all_locations_hidden: "no",
    
    //Label defaults
    label_color: "#ffffff",
    label_hover_color: "#ffffff",
    label_size: "",
    label_font: "Arial",
    label_display: "auto",
    label_scale: "yes",
    hide_labels: "no",
    hide_eastern_labels: "no",
   
    //Zoom settings
    zoom: "yes",
    manual_zoom: "yes",
    back_image: "no",
    initial_back: "no",
    initial_zoom: "-1",
    initial_zoom_solo: "no",
    region_opacity: 1,
    region_hover_opacity: 0.6,
    zoom_out_incrementally: "yes",
    zoom_percentage: 0.99,
    zoom_time: 0.5,
    
    //Popup settings
    popup_color: "white",
    popup_opacity: 0.9,
    popup_shadow: 1,
    popup_corners: 5,
    popup_font: "12px/1.5 Verdana, Arial, Helvetica, sans-serif",
    popup_nocss: "no",
    
    //Advanced settings
    div: "map",
    auto_load: "yes",
    url_new_tab: "no",
    images_directory: "default",
    fade_time: 0.1,
    link_text: "View Website",
    popups: "detect",
    state_image_url: "",
    state_image_position: "",
    location_image_url: ""
  },
  state_specific: {
    INAN: {
      name: "Andaman and Nicobar",
      color: "#ef1414",
      hover_color: "#141519"
    },
    INAP: {
      name: "Andhra Pradesh",
      color: "#e28020"
    },
    INAR: {
      name: "Arunachal Pradesh",
      color: "#c3d825"
    },
    INAS: {
      name: "Assam",
      color: "#d8985a"
    },
    INBR: {
      name: "Bihar",
      color: "#6dde47"
    },
    INCH: {
      name: "Chandigarh",
      color: "#adb540"
    },
    INCT: {
      name: "Chhattisgarh",
      color: "#616808"
    },
    INDH: {
      name: "Dādra and Nagar Haveli and Damān and Diu",
      color: "#7d7e6c"
    },
    INDL: {
      name: "Delhi",
      color: "#daa419"
    },
    INGA: {
      name: "Goa",
      color: "#a86b0e"
    },
    INGJ: {
      name: "Gujarat",
      color: "#e26b10"
    },
    INHP: {
      name: "Himachal Pradesh",
      color: "#93938d"
    },
    INHR: {
      name: "Haryana",
      color: "#daad54"
    },
    INJH: {
      name: "Jharkhand",
      color: "#9b9c9e"
    },
    INJK: {
      name: "Jammu and Kashmir",
      color: "#fc750e"
    },
    INKA: {
      name: "Karnataka",
      color: "#28a241"
    },
    INKL: {
      name: "Kerala",
      color: "#1bad39"
    },
    INLA: {
      name: "Ladakh",
      color: "#e5a14e"
    },
    INLD: {
      name: "Lakshadweep",
      color: "#e91010"
    },
    INMH: {
      name: "Maharashtra",
      color: "#f18d14"
    },
    INML: {
      name: "Meghalaya",
      color: "#beb148"
    },
    INMN: {
      name: "Manipur",
      color: "#20732d"
    },
    INMP: {
      name: "Madhya Pradesh",
      color: "#d38c35"
    },
    INMZ: {
      name: "Mizoram",
      color: "#286f5b"
    },
    INNL: {
      name: "Nagaland",
      color: "#645b5c"
    },
    INOR: {
      name: "Orissa",
      color: "#8f323f"
    },
    INPB: {
      name: "Punjab",
      color: "#c91d17"
    },
    INPY: {
      name: "Puducherry",
      color: "#b1773f"
    },
    INRJ: {
      name: "Rajasthan",
      color: "#ef8319"
    },
    INSK: {
      name: "Sikkim",
      color: "#213f17"
    },
    INTG: {
      name: "Telangana",
      color: "#62dc39"
    },
    INTN: {
      name: "Tamil Nadu",
      color: "#1ea812"
    },
    INTR: {
      name: "Tripura",
      color: "#203164"
    },
    INUP: {
      name: "Uttar Pradesh",
      color: "#93550a"
    },
    INUT: {
      name: "Uttaranchal",
      color: "#b3862f"
    },
    INWB: {
      name: "West Bengal",
      color: "#f8c96b"
    }
  },
  locations: {
    "0": {
      name: "New Delhi",
      lat: "28.6",
      lng: "77.2"
    }
  },
  labels: {
    INAN: {
      name: "Andaman and Nicobar",
      parent_id: "INAN",
      color: "#0c0809",
      size: "30"
    },
    INAP: {
      name: "Andhra Pradesh",
      parent_id: "INAP"
    },
    INAR: {
      name: "Arunachal Pradesh",
      parent_id: "INAR"
    },
    INAS: {
      name: "Assam",
      parent_id: "INAS"
    },
    INBR: {
      name: "Bihar",
      parent_id: "INBR"
    },
    INCH: {
      name: "Chandigarh",
      parent_id: "INCH"
    },
    INCT: {
      name: "Chhattisgarh",
      parent_id: "INCT"
    },
    INDH: {
      name: "Dādra and Nagar Haveli and Damān and Diu",
      parent_id: "INDH"
    },
    INDL: {
      name: "Delhi",
      parent_id: "INDL"
    },
    INGA: {
      name: "Goa",
      parent_id: "INGA"
    },
    INGJ: {
      name: "Gujarat",
      parent_id: "INGJ"
    },
    INHP: {
      name: "Himachal Pradesh",
      parent_id: "INHP"
    },
    INHR: {
      name: "Haryana",
      parent_id: "INHR"
    },
    INJH: {
      name: "Jharkhand",
      parent_id: "INJH"
    },
    INJK: {
      name: "Jammu and Kashmir",
      parent_id: "INJK"
    },
    INKA: {
      name: "Karnataka",
      parent_id: "INKA"
    },
    INKL: {
      name: "Kerala",
      parent_id: "INKL"
    },
    INLA: {
      name: "Ladakh",
      parent_id: "INLA"
    },
    INLD: {
      name: "Lakshadweep",
      parent_id: "INLD"
    },
    INMH: {
      name: "Maharashtra",
      parent_id: "INMH"
    },
    INML: {
      name: "Meghalaya",
      parent_id: "INML"
    },
    INMN: {
      name: "Manipur",
      parent_id: "INMN"
    },
    INMP: {
      name: "Madhya Pradesh",
      parent_id: "INMP"
    },
    INMZ: {
      name: "Mizoram",
      parent_id: "INMZ"
    },
    INNL: {
      name: "Nagaland",
      parent_id: "INNL"
    },
    INOR: {
      name: "Orissa",
      parent_id: "INOR"
    },
    INPB: {
      name: "Punjab",
      parent_id: "INPB"
    },
    INPY: {
      name: "Puducherry",
      parent_id: "INPY"
    },
    INRJ: {
      name: "Rajasthan",
      parent_id: "INRJ"
    },
    INSK: {
      name: "Sikkim",
      parent_id: "INSK"
    },
    INTG: {
      name: "Telangana",
      parent_id: "INTG"
    },
    INTN: {
      name: "Tamil Nadu",
      parent_id: "INTN"
    },
    INTR: {
      name: "Tripura",
      parent_id: "INTR"
    },
    INUP: {
      name: "Uttar Pradesh",
      parent_id: "INUP"
    },
    INUT: {
      name: "Uttaranchal",
      parent_id: "INUT"
    },
    INWB: {
      name: "West Bengal",
      parent_id: "INWB"
    }
  },
  legend: {
    entries: []
  },
  regions: {}
};